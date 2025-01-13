class Live2DManager {
    constructor() {
        this.currentModel = 0;
        this.models = [
            'models/assets/kei_vowels_pro/kei_vowels_pro.model3.json',
            'models/assets/shizuku/shizuku.model.json'
        ];
        this.modelConfigs = {
            'models/assets/kei_vowels_pro/kei_vowels_pro.model3.json': {
                type: 'half',
                width: 300,
                height: 400
            },
            'models/assets/shizuku/shizuku.model3.json': {
                type: 'full',
                width: 300,
                height: 600
            }
        };
        this.live2d = PIXI.live2d;
    }

    // 添加对话到记录
    addDialogMessage(text, isUser = false) {
        const dialogContent = document.getElementById('dialog-content');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'live2d-message'}`;
        
        // 创建时间戳
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // 创建角色名称和时间的容器
        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        headerDiv.textContent = `${timeStr} ${isUser ? '您' : '客服'}`;
        
        // 创建消息内容容器
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;
        
        // 组装消息
        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);
        
        dialogContent.appendChild(messageDiv);
        // 自动滚动到底部
        dialogContent.scrollTop = dialogContent.scrollHeight;
    }

    async init() {
        await this.loadModel(this.models[0]);
    }

    async loadModel(modelPath) {
        try {
            // 获取模型配置
            const config = this.modelConfigs[modelPath] || {
                type: 'half',
                width: 300,
                height: 400
            };

            // 如果已有应用实例，先销毁
            if (this.app) {
                this.app.destroy(true);
            }

            // 创建新的PIXI应用
            this.app = new PIXI.Application({
                view: document.createElement('canvas'),
                autoStart: true,
                backgroundColor: 0x00000000,
                backgroundAlpha: 0,
                width: config.width,
                height: config.height,
                transparent: true
            });

            // 获取或创建容器元素
            let container = document.getElementById('live2d-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'live2d-container';
                document.body.appendChild(container);
            } else {
                container.innerHTML = '';
            }

            container.appendChild(this.app.view);

            if (this.live2DModel) {
                this.app.stage.removeChild(this.live2DModel);
                this.live2DModel.destroy();
            }
            
            this.live2DModel = await this.live2d.Live2DModel.from(modelPath);
            this.app.stage.addChild(this.live2DModel);

            // 计算适合的缩放比例
            const containerWidth = this.app.view.width;
            const containerHeight = this.app.view.height;
            const modelWidth = this.live2DModel.width;
            const modelHeight = this.live2DModel.height;

            let scale;
            if (config.type === 'full') {
                scale = Math.min(
                    (containerWidth * 0.95) / modelWidth,
                    (containerHeight * 0.95) / modelHeight
                );
            } else {
                scale = (containerHeight * 0.8) / modelHeight;
            }

            this.live2DModel.scale.set(scale);

            this.live2DModel.x = (containerWidth - modelWidth * scale) / 2;
            this.live2DModel.y = config.type === 'full' ? 
                (containerHeight - modelHeight * scale) / 2 :
                (containerHeight - modelHeight * scale) * 0.1;

            // 设置交互属性
            this.live2DModel.buttonMode = true;
            this.live2DModel.interactive = true;

            // 添加点击事件
            this.live2DModel.on('click', async () => {
                console.log('Live2D model clicked');
                // 播放音频并添加对话记录
                try {
                    this.addDialogMessage('您好，请问有什么可以帮您？', false);
                    await window.talk(this.live2DModel, 'mp3/demo.mp3');
                } catch (error) {
                    console.error('Error playing audio:', error);
                }
            });

            // 暴露模型到全局
            window.live2DModel = this.live2DModel;

        } catch (error) {
            console.error('Failed to load Live2D model:', error);
        }
    }

    switchModel() {
        this.currentModel = (this.currentModel + 1) % this.models.length;
        this.loadModel(this.models[this.currentModel]);
    }
}

// 将talk方法暴露到全局作用域
window.talk = async function(model, audio) {
    if (!model || !audio) {
        console.error('Model or audio path is missing');
        return;
    }

    try {
        console.log('Starting audio playback:', audio);
        
        // 创建新的音频上下文（如果需要的话）
        if (!window.audioContext) {
            window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // 确保音频上下文是运行状态
        if (window.audioContext.state === 'suspended') {
            await window.audioContext.resume();
        }

        // 播放音频
        await model.speak(audio, {
            volume: 1,
            expression: 8,
            resetExpression: true,
            crossOrigin: "anonymous"
        });

        console.log('Audio playback completed');
    } catch (error) {
        console.error('Error in talk function:', error);
    }
};

// 将addDialogMessage方法暴露到全局作用域
window.addDialogMessage = function(text, isUser = false) {
    if (window.live2DManager) {
        window.live2DManager.addDialogMessage(text, isUser);
    } else {
        console.error('Live2DManager not initialized');
    }
};

// 初始化Live2D
document.addEventListener('DOMContentLoaded', () => {
    window.live2DManager = new Live2DManager();
    window.live2DManager.init().then(() => {
        console.log('Live2D initialized');
        // 添加初始欢迎消息
        window.addDialogMessage('您好，欢迎来到VR看房，我是您的专属客服，请问有什么可以帮您？', false);
    });
}); 
