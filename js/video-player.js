class VideoPlayer {
    constructor() {
        this.canvas = document.getElementById('videoCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.display = 'none';
        this.frames = [];
        this.currentFrame = 0;
        this.isPlaying = false;
        this.frameCount = 0;
        this.silenceThreshold = -40; // 设置静音阈值为 -40 dB
        this.fps = null; // 稍后从视频中获取实际帧率
        this.isAnimating = false; // 添加动画状态标记
        this.isInLoop = false;
    }

    async loadVideo() {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = 'video/speaker3.mp4';
            video.crossOrigin = 'anonymous';
            
            // 添加这些属性来允许自动播放
            video.muted = true;
            video.playsInline = true;
            
            // 设置视频样式
            video.style.display = 'none';
            document.body.appendChild(video);

            video.addEventListener('loadedmetadata', async () => {
                this.canvas.width = video.videoWidth;
                this.canvas.height = video.videoHeight;
                
                // 设置默认帧率为60fps
                this.fps = 60;
                const totalFrames = 180; // 设置总帧数
                
                console.log(`视频实际帧率: ${this.fps} fps`);
                console.log(`视频时长: ${video.duration} 秒`);
                console.log(`开始提取 ${totalFrames} 帧...`);
                
                const extractFrames = async () => {
                    try {
                        let currentFrame = 0;
                        const frameInterval = video.duration / totalFrames;

                        const processFrame = async () => {
                            if (currentFrame < totalFrames) {
                                // 设置视频时间
                                video.currentTime = currentFrame * frameInterval;
                                
                                // 等待视频更新到指定时间
                                await new Promise(resolve => {
                                    video.addEventListener('seeked', resolve, { once: true });
                                });

                                this.ctx.drawImage(video, 0, 0);
                                this.frames.push(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
                                
                                // 显示进度
                                if (currentFrame % 10 === 0) {
                                    console.log(`提取进度: ${Math.round((currentFrame / totalFrames) * 100)}%`);
                                }
                                
                                currentFrame++;
                                await processFrame();
                            } else {
                                this.frameCount = this.frames.length;
                                console.log(`成功提取 ${this.frameCount} 帧`);
                                // 显示画板并清理视频元素
                                this.canvas.style.display = 'block';
                                document.body.removeChild(video);
                                // 开始循环播放静音状态动画
                                this.startLoopAnimation();
                                resolve();
                            }
                        };

                        // 开始提取帧
                        await processFrame();

                    } catch (error) {
                        console.error('帧提取错误:', error);
                        reject(error);
                    }
                };

                // 开始提取帧
                extractFrames().catch(reject);
            });

            video.addEventListener('error', (e) => {
                console.error('视频加载错误:', e);
                reject(e);
            });

            // 添加加载超时处理
            const timeoutId = setTimeout(() => {
                reject(new Error('视频加载超时'));
            }, 10000); // 10秒超时

            video.addEventListener('canplay', () => {
                clearTimeout(timeoutId);
            });
        });
    }

    playFrameRange(startFrame, endFrame, duration) {
        return new Promise((resolve) => {
            const frameCount = endFrame - startFrame;
            const frameDuration = duration / frameCount;
            let currentIndex = 0;

            this.isAnimating = true; // 开始动画时设置标记

            const animate = () => {
                if (currentIndex >= frameCount) {
                    this.isAnimating = false; // 动画结束时重置标记
                    resolve();
                    return;
                }

                const frameIndex = startFrame + (currentIndex % frameCount);
                if (this.frames[frameIndex]) {
                    this.ctx.putImageData(this.frames[frameIndex], 0, 0);
                }
                currentIndex++;

                setTimeout(() => requestAnimationFrame(animate), frameDuration * 1000);
            };

            requestAnimationFrame(animate);
        });
    }

    async syncWithAudio(audioPath) {
        try {
            // 停止当前的循环播放
            this.stopLoopAnimation();

            // 如果当前正在播放动画，等待其结束
            if (this.isAnimating) {
                console.log('等待上一次动画结束...');
                await new Promise(resolve => {
                    const checkAnimation = () => {
                        if (!this.isAnimating) {
                            resolve();
                        } else {
                            setTimeout(checkAnimation, 100);
                        }
                    };
                    checkAnimation();
                });
                console.log('上一次动画已结束，开始新的播放');
            }

            // 1. 创建音频上下文和分析器
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const response = await fetch(audioPath);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // 2. 先分析整个音频，找出所有的静音片段和说话片段
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            const bufferLength = analyser.frequencyBinCount;
            const sampleRate = audioContext.sampleRate;
            const samplesPerFrame = Math.floor(sampleRate / this.fps);
            
            // 存储音频片段信息
            const audioSegments = [];
            let isInSilence = false;
            let segmentStartTime = 0;
            let currentType = 'speaking'; // 'speaking' 或 'silence'

            // 3. 分析音频数据
            const audioData = audioBuffer.getChannelData(0);
            const framesCount = Math.floor(audioData.length / samplesPerFrame);

            for (let i = 0; i < framesCount; i++) {
                const startSample = i * samplesPerFrame;
                const endSample = Math.min(startSample + samplesPerFrame, audioData.length);
                
                // 计算这一帧的平均振幅
                let sum = 0;
                for (let j = startSample; j < endSample; j++) {
                    sum += Math.abs(audioData[j]);
                }
                const averageAmplitude = sum / (endSample - startSample);
                const db = 20 * Math.log10(averageAmplitude);

                // 检测静音
                if (db < this.silenceThreshold && !isInSilence) {
                    // 开始静音
                    if ((i / this.fps) - segmentStartTime > 0.5) { // 静音超过0.5秒
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
                    // 结束静音
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

            // 添加最后一个片段
            audioSegments.push({
                type: currentType,
                startTime: segmentStartTime,
                endTime: audioBuffer.duration
            });
            // 遍历音频片段，如果静音片段长度小于0.5秒，则合并到上一个说话片段
            for (let i = 0; i < audioSegments.length; i++) {
                if (audioSegments[i].type === 'silence' && audioSegments[i].endTime - audioSegments[i].startTime < 0.5) {
                    audioSegments[i - 1].endTime = audioSegments[i].endTime;
                    audioSegments.splice(i, 1);
                    i--;
                }
            }
            // 遍历音频片段，连续的2段说话片段，请合并为一段说话片段
            for (let i = 0; i < audioSegments.length; i++) {
                if (audioSegments[i].type === 'speaking' && audioSegments[i + 1].type === 'speaking') {
                    audioSegments[i].endTime = audioSegments[i + 1].endTime;
                    audioSegments.splice(i + 1, 1);
                    i--;
                }
            }

            // 4. 计算每个片段对应的视频帧范围
            const frameRanges = [];

            for (const segment of audioSegments) {
                const duration = segment.endTime - segment.startTime;
                let requiredFrames = Math.floor(duration * this.fps);

                if (segment.type === 'speaking') {
                    
                    do{
                        frameRanges.push([10, Math.min(95, 10 + requiredFrames)]);
                        requiredFrames = requiredFrames - 85;
                    }while(requiredFrames > 85);
                } else { // silence
                    do{
                        frameRanges.push([95, Math.min(180, 95 + requiredFrames)]);
                        requiredFrames = requiredFrames - 85;
                    }while(requiredFrames > 85);
                }
            }

            console.log('音频片段分析结果:', audioSegments);
            console.log('对应的帧范围:', frameRanges);

            // 5. 播放音频和视频
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            let currentSegmentIndex = 0;
            let startTime = audioContext.currentTime;

            const playNextSegment = async () => {
                if (currentSegmentIndex >= audioSegments.length) return;

                const segment = audioSegments[currentSegmentIndex];
                const frameRange = frameRanges[currentSegmentIndex];
                const duration = segment.endTime - segment.startTime;

                await this.playFrameRange(frameRange[0], frameRange[1], duration);
                currentSegmentIndex++;
                
                if (currentSegmentIndex < audioSegments.length) {
                    setTimeout(playNextSegment, 0);
                }
            };

            source.start();
            playNextSegment();

            return new Promise((resolve) => {
                source.onended = () => {
                    // 音频播放结束后，重新开始循环播放
                    this.startLoopAnimation();
                    resolve();
                };
            });

        } catch (error) {
            console.error('音频处理错误:', error);
            // 发生错误时也要重新开始循环播放
            this.startLoopAnimation();
            throw error;
        }
    }

    // 新增：判断是否正在播放动画
    isCurrentlyAnimating() {
        return this.isAnimating;
    }

    // 新增：循环播放静音状态的动画
    async  startLoopAnimation() {
        if ( this.isInLoop) {
            console.log('当前有动画正在播放，无法开始循环播放');
            return;
        }


            // 如果当前正在播放动画，等待其结束
            if (this.isAnimating) {
                console.log('等待上一次动画结束...');
                await new Promise(resolve => {
                    const checkAnimation = () => {
                        if (!this.isAnimating) {
                            resolve();
                        } else {
                            setTimeout(checkAnimation, 100);
                        }
                    };
                    checkAnimation();
                });
                console.log('上一次动画已结束，开始循环播放');
            }
   



        this.isInLoop = true;
        const startFrame = 100;
        const endFrame = 180;
        let currentIndex = 0;
        const frameCount = endFrame - startFrame;
        
        const animate = () => {
            if (!this.isInLoop || this.isAnimating) {
                return; // 如果动画被停止，则退出
            }

            const frameIndex = startFrame + (currentIndex % frameCount);
            if (this.frames[frameIndex]) {
                this.ctx.putImageData(this.frames[frameIndex], 0, 0);
            }

            currentIndex = (currentIndex + 1) % frameCount;

            // 使用 1/60 秒的间隔来播放，保持流畅
            setTimeout(() => requestAnimationFrame(animate), 1000 / 60);
        };
        if(!this.isAnimating){
            requestAnimationFrame(animate);
        }

    }

    // 新增：停止循环播放
    stopLoopAnimation() {
        this.isInLoop = false;
    }
} 