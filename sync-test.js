// 简单的同步测试函数
async function testSync() {
    const characters = JSON.parse(localStorage.getItem('cached_characters') || '[]');
    console.log('测试同步', characters.length, '个角色');
    
    if (characters.length === 0) {
        alert('没有角色数据可同步');
        return;
    }
    
    // 方案1：尝试简单的跨窗口通信
    try {
        // 打开前端应用
        const frontendWindow = window.open('https://aiko-spark-sync.vercel.app/', '_blank');
        
        // 等待页面加载
        setTimeout(() => {
            try {
                // 通过postMessage发送数据
                frontendWindow.postMessage({
                    type: 'SYNC_CHARACTERS',
                    data: {
                        characters: characters.slice(0, 10), // 只发送前10个测试
                        timestamp: Date.now(),
                        source: 'admin-test'
                    }
                }, 'https://aiko-spark-sync.vercel.app');
                
                console.log('✅ 已发送测试数据到前端');
                alert('测试数据已发送到前端！请检查前端页面。');
            } catch (error) {
                console.error('跨窗口通信失败:', error);
                alert('跨窗口通信失败: ' + error.message);
            }
        }, 3000);
        
    } catch (error) {
        console.error('测试失败:', error);
        alert('测试失败: ' + error.message);
    }
}

// 添加测试按钮
const testBtn = document.createElement('button');
testBtn.textContent = '🧪 测试同步';
testBtn.className = 'px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600';
testBtn.onclick = testSync;
document.body.appendChild(testBtn);

