document.addEventListener('DOMContentLoaded', async () => {
    // 初始化Live2D
    const live2DManager = new Live2DManager();
    await live2DManager.init();

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
    window.babylonManager = new BabylonSceneManager();
    await window.babylonManager.createScene();
    window.babylonManager.run();

    // 初始化完成后取消加载状态
    setButtonLoading(false);

    // 绑定按钮事件
    document.getElementById('changeLive2D').addEventListener('click', () => {
        live2DManager.switchModel();
    });

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
    const closeDialogBtn = document.getElementById('closeDialog');
    const showDialogBtn = document.getElementById('showDialog');

    // 关闭对话框
    closeDialogBtn.addEventListener('click', () => {
        dialogBox.style.display = 'none';
        showDialogBtn.style.display = 'block';
    });

    // 显示对话框
    showDialogBtn.addEventListener('click', () => {
        dialogBox.style.display = 'flex';
        showDialogBtn.style.display = 'none';
    });

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
            // TODO: 发送消息到服务端
            // const response = await fetch('YOUR_API_ENDPOINT', {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //     },
            //     body: JSON.stringify({ message })
            // });
            // const data = await response.json();
            
            // 清空输入框
            userInput.value = '';

            // 模拟服务端响应（实际项目中替换为真实的服务端响应）
            setTimeout(() => {
                window.addDialogMessage('收到您的问题，我们会尽快为您解答。', false);
            }, 500);

        } catch (error) {
            console.error('Error sending message:', error);
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