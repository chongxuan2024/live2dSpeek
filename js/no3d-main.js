document.addEventListener('DOMContentLoaded', async () => {
    // 添加全局对话消息方法
    window.addDialogMessage = function(text, isUser = false) {
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
    };

    // 创建视频播放器实例
    window.videoPlayer = new VideoPlayer();

    // 在第一次用户交互时初始化视频
    const initVideoOnInteraction = async () => {
        try {
            await window.videoPlayer.loadVideo();
            console.log('视频加载完成');
            // 添加初始欢迎消息
            window.addDialogMessage('您好，我是您的AI助手，请问有什么可以帮您？', false);
        } catch (error) {
            console.error('视频加载失败:', error);
        }
        // 移除事件监听器
        document.removeEventListener('click', initVideoOnInteraction);
    };

    // 监听用户交互
    document.addEventListener('click', initVideoOnInteraction, { once: true });

    // 添加消息发送功能
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendMessage');

    // 音频文件列表
    const audioFiles = [
        'mp3/2.mp3',
        'mp3/3.mp3',
        'mp3/4.mp3',
        'mp3/5.mp3',
        'mp3/demo.mp3',
    ];

    // 获取随机音频文件
    function getRandomAudioFile() {
        const randomIndex = Math.floor(Math.random() * audioFiles.length);
        return audioFiles[randomIndex];
    }

    // 发送消息的函数
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // 添加用户消息到对话框
        window.addDialogMessage(message, true);

        try {
            // 清空输入框
            userInput.value = '';

            // 模拟服务端响应
            setTimeout(() => {
                window.addDialogMessage('收到您的问题，我们会尽快为您解答。', false);
                // 在回复消息后播放音频并同步视频
                window.videoPlayer.syncWithAudio(getRandomAudioFile());
            }, 500);

        } catch (error) {
            console.error('Error:', error);
            window.addDialogMessage('消息发送失败，请稍后重试。', false);
        }
    }

    // 绑定发送按钮点击事件
    sendButton.addEventListener('click', sendMessage);

    // 绑定输入框回车事件
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}); 