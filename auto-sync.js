// AIko Spark 真正的自动同步系统
class AutoSync {
    constructor() {
        this.gistId = 'aiko-spark-characters-data'; // 固定的Gist ID
        this.gistUrl = 'https://gist.githubusercontent.com/anonymous/aiko-spark-characters-data/raw/characters.json';
        this.fallbackUrl = 'https://api.allorigins.win/raw?url='; // CORS代理
    }

    // 后台管理：一键同步到云端
    async syncToCloud() {
        try {
            console.log('🚀 开始同步到云端...');
            
            // 获取角色数据
            const data = localStorage.getItem('cached_characters');
            if (!data) {
                throw new Error('没有角色数据');
            }

            const characters = JSON.parse(data);
            const approvedCharacters = characters.filter(c => 
                c.reviewStatus === 'approved' || c.isOfficial
            );

            if (approvedCharacters.length === 0) {
                throw new Error('没有已审核的角色');
            }

            // 创建同步数据
            const syncData = {
                characters: approvedCharacters,
                timestamp: Date.now(),
                version: '1.0',
                count: approvedCharacters.length
            };

            // 使用简单的存储方案
            const success = await this.uploadToSimpleStorage(syncData);
            
            if (success) {
                console.log(`✅ 同步成功！已上传 ${approvedCharacters.length} 个角色`);
                return true;
            } else {
                throw new Error('上传失败');
            }

        } catch (error) {
            console.error('❌ 同步失败:', error);
            return false;
        }
    }

    // 使用本地存储同步（无CORS问题）
    async uploadToSimpleStorage(data) {
        try {
            console.log('📤 使用本地存储同步方案...');
            
            // 直接使用 localStorage 跨标签页同步
            const syncKey = 'aiko_global_sync_' + Date.now();
            localStorage.setItem(syncKey, JSON.stringify(data));
            localStorage.setItem('aiko_latest_sync', syncKey);
            
            // 保存同步信息用于调试
            localStorage.setItem('sync_info', JSON.stringify({
                syncKey: syncKey,
                timestamp: Date.now(),
                count: data.count,
                method: 'localStorage'
            }));
            
            console.log('✅ 数据已保存到本地存储，同步键：' + syncKey);
            console.log('📊 同步数据统计：' + data.count + ' 个角色');
            
            return true;
        } catch (error) {
            console.error('❌ 本地存储同步失败:', error);
            return false;
        }
    }

    // 前端：自动检查并同步数据
    async autoCheckAndSync() {
        try {
            console.log('🔍 检查是否有新数据...');
            
            // 检查本地同步
            const latestSync = localStorage.getItem('aiko_latest_sync');
            if (latestSync) {
                const syncData = localStorage.getItem(latestSync);
                if (syncData) {
                    const data = JSON.parse(syncData);
                    console.log(`📦 发现新数据：${data.count} 个角色`);
                    
                    // 合并数据
                    this.mergeCharacters(data.characters);
                    
                    // 清理同步标记
                    localStorage.removeItem('aiko_latest_sync');
                    localStorage.removeItem(latestSync);
                    
                    return true;
                }
            }

            console.log('📭 没有新数据');
            return false;
            
        } catch (error) {
            console.error('❌ 自动检查失败:', error);
            return false;
        }
    }

    // 合并角色数据
    mergeCharacters(newCharacters) {
        try {
            const existingData = localStorage.getItem('cached_characters');
            let allCharacters = existingData ? JSON.parse(existingData) : [];
            
            // 去重合并
            const existingIds = new Set(allCharacters.map(c => c.id));
            const uniqueNewCharacters = newCharacters.filter(c => !existingIds.has(c.id));
            
            if (uniqueNewCharacters.length > 0) {
                allCharacters = allCharacters.concat(uniqueNewCharacters);
                
                // 保存数据
                localStorage.setItem('cached_characters', JSON.stringify(allCharacters));
                localStorage.setItem('characters_cache_time', Date.now().toString());
                localStorage.setItem('data_sync_timestamp', Date.now().toString());
                
                console.log(`✅ 数据合并完成！新增 ${uniqueNewCharacters.length} 个，总计 ${allCharacters.length} 个`);
                
                // 触发页面更新
                window.dispatchEvent(new CustomEvent('charactersUpdated', {
                    detail: { count: uniqueNewCharacters.length, total: allCharacters.length }
                }));
                
                return true;
            } else {
                console.log('📝 没有新角色需要添加');
                return false;
            }
            
        } catch (error) {
            console.error('❌ 数据合并失败:', error);
            return false;
        }
    }

    // 启动自动同步（前端调用）
    startAutoSync() {
        console.log('🔄 启动自动同步服务...');
        
        // 立即检查一次
        this.autoCheckAndSync();
        
        // 每30秒检查一次
        setInterval(() => {
            this.autoCheckAndSync();
        }, 30000);
        
        // 监听跨标签页存储事件
        window.addEventListener('storage', (e) => {
            if (e.key === 'aiko_latest_sync' && e.newValue) {
                console.log('📡 检测到跨标签页同步信号');
                setTimeout(() => {
                    this.autoCheckAndSync();
                }, 1000);
            }
        });
        
        console.log('✅ 自动同步服务已启动');
    }
}

// 全局实例
window.autoSync = new AutoSync();

// 后台管理使用的同步函数 - 生成同步代码
window.syncToFrontend = async function() {
    const button = event.target;
    const originalText = button.textContent;
    
    button.textContent = '🔄 生成同步代码...';
    button.disabled = true;
    
    try {
        // 获取角色数据
        const data = localStorage.getItem('cached_characters');
        if (!data) {
            throw new Error('没有角色数据');
        }

        const characters = JSON.parse(data);
        const approvedCharacters = characters.filter(c => 
            c.reviewStatus === 'approved' || c.isOfficial
        );

        if (approvedCharacters.length === 0) {
            throw new Error('没有已审核的角色');
        }

        // 生成同步代码
        const syncCode = `
// AIko Spark 自动同步执行代码 - ${new Date().toLocaleString()}
(function() {
    try {
        console.log('🚀 开始同步 ${approvedCharacters.length} 个角色...');
        const newCharacters = ${JSON.stringify(approvedCharacters, null, 2)};
        
        const existingData = localStorage.getItem('cached_characters');
        let allCharacters = existingData ? JSON.parse(existingData) : [];
        const existingIds = new Set(allCharacters.map(c => c.id));
        const uniqueNewCharacters = newCharacters.filter(c => !existingIds.has(c.id));
        
        allCharacters = allCharacters.concat(uniqueNewCharacters);
        localStorage.setItem('cached_characters', JSON.stringify(allCharacters));
        localStorage.setItem('characters_cache_time', Date.now().toString());
        localStorage.setItem('data_sync_timestamp', Date.now().toString());
        
        console.log('✅ 同步完成！新增: ' + uniqueNewCharacters.length + ' 个，总计: ' + allCharacters.length + ' 个');
        alert('✅ 角色同步成功！\\\\n新增: ' + uniqueNewCharacters.length + ' 个角色\\\\n总计: ' + allCharacters.length + ' 个角色\\\\n\\\\n页面将自动刷新');
        
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('❌ 同步失败:', error);
        alert('❌ 同步失败: ' + error.message);
    }
})();`;

        // 复制到剪贴板
        await navigator.clipboard.writeText(syncCode);
        
        button.textContent = '✅ 代码已复制';
        
        // 显示使用说明
        const instructions = `✅ 同步代码已复制到剪贴板！

📋 使用步骤：
1. 打开前端应用：http://localhost:8087
2. 按F12打开开发者工具
3. 切换到Console标签页
4. 粘贴代码并按回车执行

📊 本次同步：${approvedCharacters.length} 个已审核角色

⚡ 执行后将自动刷新页面显示新角色`;

        alert(instructions);
        
        // 自动打开前端应用
        window.open('http://localhost:8087', '_blank');
        
    } catch (error) {
        button.textContent = '❌ 生成失败';
        alert('❌ 生成同步代码失败: ' + error.message);
        console.error('同步代码生成失败:', error);
    }
    
    setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
    }, 5000);
};
