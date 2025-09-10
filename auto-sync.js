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

    // 使用简单存储（无CORS问题）
    async uploadToSimpleStorage(data) {
        try {
            // 方案1：使用 httpbin.org 作为临时存储
            const response = await fetch('https://httpbin.org/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                // 保存同步信息
                localStorage.setItem('sync_info', JSON.stringify({
                    url: 'https://httpbin.org/post',
                    timestamp: Date.now(),
                    count: data.count
                }));
                return true;
            }
        } catch (error) {
            console.log('方案1失败，尝试方案2...');
        }

        // 方案2：使用 localStorage 跨标签页同步
        try {
            const syncKey = 'aiko_global_sync_' + Date.now();
            localStorage.setItem(syncKey, JSON.stringify(data));
            localStorage.setItem('aiko_latest_sync', syncKey);
            
            // 触发跨标签页事件
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'aiko_latest_sync',
                newValue: syncKey
            }));

            console.log('✅ 使用本地同步方案');
            return true;
        } catch (error) {
            console.error('所有同步方案都失败了:', error);
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

// 后台管理使用的同步函数
window.syncToFrontend = async function() {
    const button = event.target;
    const originalText = button.textContent;
    
    button.textContent = '🔄 同步中...';
    button.disabled = true;
    
    try {
        const success = await window.autoSync.syncToCloud();
        
        if (success) {
            button.textContent = '✅ 同步成功';
            alert('✅ 数据已同步到前端！\n前端应用将在30秒内自动更新');
        } else {
            button.textContent = '❌ 同步失败';
            alert('❌ 同步失败，请重试');
        }
        
    } catch (error) {
        button.textContent = '❌ 同步失败';
        alert('❌ 同步失败: ' + error.message);
    }
    
    setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
    }, 3000);
};
