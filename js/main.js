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
            window.addDialogMessage('您好，欢迎来到VR看房，我是您的专属客服，请问有什么可以帮您？', false);
        } catch (error) {
            console.error('视频加载失败:', error);
        }
        // 移除事件监听器
        document.removeEventListener('click', initVideoOnInteraction);
    };

    // 监听用户交互
    document.addEventListener('click', initVideoOnInteraction, { once: true });

    // 获取切换房屋按钮
    const changeHouseBtn = document.getElementById('changeHouse');
    
    // 设置按钮加载状态的函数
    function setButtonLoading(loading) {
        if (loading) {
            changeHouseBtn.classList.add('loading');
            changeHouseBtn.disabled = true;
        } else {
            changeHouseBtn.classList.remove('loading');
            changeHouseBtn.disabled = false;
        }
    }

    // 初始化时设置为加载状态
    setButtonLoading(true);

    // 初始化Babylon场景并暴露到全局
    try{
        window.babylonManager = new BabylonSceneManager();
        await window.babylonManager.createScene();
        window.babylonManager.run();
    }catch(error){
        console.error('Babylon初始化失败:', error);
    }
    // 初始化完成后取消加载状态
    setButtonLoading(false);

    // 修改切换房屋按钮的点击事件
    changeHouseBtn.addEventListener('click', async () => {
        setButtonLoading(true);
        try {
            await window.babylonManager.switchHouse();
        } finally {
            setButtonLoading(false);
        }
    });

    // 添加重置房屋视角按钮事件
    document.getElementById('resetHouse').addEventListener('click', () => {
        window.babylonManager.resetHouse();
    });

    // 对话框控制
    const dialogBox = document.getElementById('dialogBox');

    // 添加消息发送功能
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendMessage');

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
                window.videoPlayer.syncWithAudio('mp3/demo.mp3');
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