class VideoPlayer {
    constructor() {
        this.videoContainer = document.getElementById('video-canvas-container');
        this.video = document.createElement('video');
        this.video.style.width = '100%';
        this.video.style.height = '100%';
        this.video.style.objectFit = 'contain';
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.loop = false;
        this.fps = 36.29;
        this.isPlaying = false;
        this.silenceThreshold = -40;
        this.loopPlaying = false;
        this.isSyncPlaying = false;
        this.speakingStartFrame = 0.2;
        this.speakingEndFrame = 1.6;
        this.silenceStartFrame = 2;
        this.silenceEndFrame = 3.0; // 最大是3.4
        // 不说话的loop可以是一个比较长的
        // 如果说话的长度比较大，也可以包含一个有动作的

    }

    async loadVideo() {
        return new Promise((resolve, reject) => {
            this.video.src = 'video/speaker3.mp4';
            this.video.crossOrigin = 'anonymous';

            this.video.addEventListener('loadedmetadata', () => {
                console.log('视频加载完成');
                this.videoContainer.appendChild(this.video);
                setTimeout(() => this.startLoop(), 0);
                resolve();
            });

            this.video.addEventListener('error', (e) => {
                console.error('视频加载错误:', e);
                reject(e);
            });
        });
    }

    async startLoop() {
        this.loopPlaying = true;
        while (this.loopPlaying) {
            if (!this.isSyncPlaying) {
                await this.playVideoRange(this.silenceStartFrame, this.silenceEndFrame);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    stopLoop() {
        this.loopPlaying = false;
    }

    async playVideoRange(startTime, endTime) {
        return new Promise((resolve) => {
            this.video.currentTime = startTime;

            const onTimeUpdate = () => {
                this.isPlaying = true;
                if (this.video.currentTime >= endTime) {
                    this.video.pause();
                    this.isPlaying = false;
                    this.video.currentTime = endTime;
                    this.video.removeEventListener('timeupdate', onTimeUpdate);
                    resolve();
                }
            };

            this.video.addEventListener('timeupdate', onTimeUpdate);

            this.video.play().catch(error => {
                console.error('播放视频失败:', error);
                this.video.removeEventListener('timeupdate', onTimeUpdate);
                resolve();
            });
        });
    }

    async syncWithAudio(audioPath) {
        try {
            this.isSyncPlaying = true;
            this.stopLoop();
            if (this.isPlaying) {
                while (this.isPlaying) {
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const response = await fetch(audioPath);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            const bufferLength = analyser.frequencyBinCount;
            const sampleRate = audioContext.sampleRate;
            const samplesPerFrame = Math.floor(sampleRate / this.fps);

            const audioSegments = [];
            let isInSilence = false;
            let segmentStartTime = 0;
            let currentType = 'speaking';

            const audioData = audioBuffer.getChannelData(0);
            const framesCount = Math.floor(audioData.length / samplesPerFrame);

            for (let i = 0; i < framesCount; i++) {
                const startSample = i * samplesPerFrame;
                const endSample = Math.min(startSample + samplesPerFrame, audioData.length);

                let sum = 0;
                for (let j = startSample; j < endSample; j++) {
                    sum += Math.abs(audioData[j]);
                }
                const averageAmplitude = sum / (endSample - startSample);
                const db = 20 * Math.log10(averageAmplitude);

                if (db < this.silenceThreshold && !isInSilence) {
                    if ((i / this.fps) - segmentStartTime > 0.5) {
                        audioSegments.push({
                            type: currentType,
                            startTime: segmentStartTime,
                            endTime: i / this.fps
                        });
                        segmentStartTime = i / this.fps;
                        currentType = 'silence';
                        isInSilence = true;
                    }
                } else if (db >= this.silenceThreshold && isInSilence) {
                    audioSegments.push({
                        type: currentType,
                        startTime: segmentStartTime,
                        endTime: i / this.fps
                    });
                    segmentStartTime = i / this.fps;
                    currentType = 'speaking';
                    isInSilence = false;
                }
            }

            audioSegments.push({
                type: currentType,
                startTime: segmentStartTime,
                endTime: audioBuffer.duration
            });

            // 合并静音片段
            for (let i = 0; i < audioSegments.length; i++) {
                if (i === 0) continue;
                
                if (audioSegments[i].type === 'silence' && audioSegments[i].endTime - audioSegments[i].startTime < 0.5) {
                    audioSegments[i - 1].endTime = audioSegments[i].endTime;
                    audioSegments.splice(i, 1);
                    i--;
                }
            }

            // 合并说话片段
            for (let i = 0; i < audioSegments.length; i++) {
                if (i >= audioSegments.length - 1) break;
                
                if (audioSegments[i].type === 'speaking' && audioSegments[i + 1].type === 'speaking') {
                    audioSegments[i].endTime = audioSegments[i + 1].endTime;
                    audioSegments.splice(i + 1, 1);
                    i--;
                }
            }
            // 如果音频片段为空，则添加一个说话片段
            if (audioSegments.length === 0) {
                audioSegments.push({
                    type: 'speaking',
                    startTime: 0,
                    endTime: audioBuffer.duration
                });
            }

            const frameRanges = [];

            const timeRanges = [];
            for (const segment of audioSegments) {
                let duration = segment.endTime - segment.startTime;
                if (segment.type === 'speaking') {
                    do {
                        // 如果剩下的时间小于0.1秒，且前一个是说话片段，直接修改前一个说话片段的endTime，加上当前的duration
                        if (duration <= 0.1 && timeRanges.length > 0 && timeRanges[timeRanges.length - 1][0] === this.speakingStartFrame) {
                            timeRanges[timeRanges.length - 1][1] = Math.min(this.speakingEndFrame, timeRanges[timeRanges.length - 1][1] + duration);
                            duration = 0;
                            break;
                        }
                        timeRanges.push([this.speakingStartFrame, Math.min(this.speakingEndFrame, this.speakingStartFrame + duration)]);
                        duration = duration - (this.speakingEndFrame - this.speakingStartFrame);
                    } while (duration > 0);
                    
                } else {
                    do {
                        // 如果剩下的时间小于0.1秒，且前一个是静音片段，直接修改前一个静音片段的endTime，加上当前的duration
                        if (duration <= 0.1 && timeRanges.length > 0 && timeRanges[timeRanges.length - 1][0] === this.silenceStartFrame) {
                            timeRanges[timeRanges.length - 1][1] = Math.min(this.silenceEndFrame, timeRanges[timeRanges.length - 1][1] + duration);
                            duration = 0;
                            break;
                        }
                        timeRanges.push([this.silenceStartFrame, Math.min(this.silenceEndFrame, this.silenceStartFrame + duration)]);
                        duration = duration - (this.silenceEndFrame - this.silenceStartFrame);
                    } while (duration > 0);
                }
            }

            console.log('音频片段分析结果:', audioSegments);
            console.log('对应的时间范围:', timeRanges);

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            return new Promise(async (resolve) => {
                source.start();
                await this.playVideoSequence(timeRanges);

                this.isSyncPlaying = false;
                this.startLoop();
                source.onended = () => {
                    resolve();
                };
            });

        } catch (error) {
            console.error('音频同步错误:', error);
            this.isSyncPlaying = false;
            this.startLoop();
            throw error;
        }
    }

    interrupt() {
        this.needInterrupted = true;
    }

    async playVideoSequence(timeRanges) {
        for (const range of timeRanges) {
            if (this.needInterrupted) {
                console.log('播放序列被打断');
                break;
            }

            try {
                await this.playVideoRange(range[0], range[1]);
            } catch (error) {
                console.error('播放片段失败:', error);
            }
        }
    }
}
