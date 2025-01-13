document.addEventListener('DOMContentLoaded', async () => {
    // 初始化Live2D
    const live2DManager = new Live2DManager();
    await live2DManager.init();

    // 初始化Babylon场景并暴露到全局
    window.babylonManager = new BabylonSceneManager();
    await window.babylonManager.createScene();
    window.babylonManager.run();

    // 绑定按钮事件
    document.getElementById('changeLive2D').addEventListener('click', () => {
        live2DManager.switchModel();
    });

    document.getElementById('changeHouse').addEventListener('click', () => {
        window.babylonManager.switchHouse();
    });
}); 