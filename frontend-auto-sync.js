// 前端自动同步集成代码
// 这个文件需要集成到前端应用中

// 在前端应用的main.tsx或App.tsx中添加以下代码：

/*
import { useEffect } from 'react';

// 在App组件中添加：
useEffect(() => {
    // 启动自动同步
    const startAutoSync = () => {
        console.log('🔄 启动前端自动同步服务...');
        
        // 自动检查并同步数据
        const autoCheckAndSync = async () => {
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
                        const existingData = localStorage.getItem('cached_characters');
                        let allCharacters = existingData ? JSON.parse(existingData) : [];
                        
                        // 去重合并
                        const existingIds = new Set(allCharacters.map(c => c.id));
                        const uniqueNewCharacters = data.characters.filter(c => !existingIds.has(c.id));
                        
                        if (uniqueNewCharacters.length > 0) {
                            allCharacters = allCharacters.concat(uniqueNewCharacters);
                            
                            // 保存数据
                            localStorage.setItem('cached_characters', JSON.stringify(allCharacters));
                            localStorage.setItem('characters_cache_time', Date.now().toString());
                            localStorage.setItem('data_sync_timestamp', Date.now().toString());
                            
                            console.log(`✅ 自动同步完成！新增 ${uniqueNewCharacters.length} 个，总计 ${allCharacters.length} 个`);
                            
                            // 刷新页面显示新数据
                            window.location.reload();
                        }
                        
                        // 清理同步标记
                        localStorage.removeItem('aiko_latest_sync');
                        localStorage.removeItem(latestSync);
                        
                        return true;
                    }
                }
                
                return false;
                
            } catch (error) {
                console.error('❌ 自动检查失败:', error);
                return false;
            }
        };
        
        // 立即检查一次
        autoCheckAndSync();
        
        // 每30秒检查一次
        const interval = setInterval(() => {
            autoCheckAndSync();
        }, 30000);
        
        // 监听跨标签页存储事件
        const handleStorageChange = (e) => {
            if (e.key === 'aiko_latest_sync' && e.newValue) {
                console.log('📡 检测到跨标签页同步信号');
                setTimeout(() => {
                    autoCheckAndSync();
                }, 1000);
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        
        console.log('✅ 前端自动同步服务已启动');
        
        // 清理函数
        return () => {
            clearInterval(interval);
            window.removeEventListener('storage', handleStorageChange);
        };
    };
    
    const cleanup = startAutoSync();
    
    return cleanup;
}, []);
*/

// 或者更简单的方式，直接在index.html中添加：
const FRONTEND_AUTO_SYNC_SCRIPT = `
<script>
// AIko Spark 前端自动同步
(function() {
    console.log('🔄 启动前端自动同步服务...');
    
    const autoCheckAndSync = async () => {
        try {
            const latestSync = localStorage.getItem('aiko_latest_sync');
            if (latestSync) {
                const syncData = localStorage.getItem(latestSync);
                if (syncData) {
                    const data = JSON.parse(syncData);
                    console.log('📦 发现新数据：' + data.count + ' 个角色');
                    
                    // 合并数据
                    const existingData = localStorage.getItem('cached_characters');
                    let allCharacters = existingData ? JSON.parse(existingData) : [];
                    const existingIds = new Set(allCharacters.map(c => c.id));
                    const uniqueNewCharacters = data.characters.filter(c => !existingIds.has(c.id));
                    
                    if (uniqueNewCharacters.length > 0) {
                        allCharacters = allCharacters.concat(uniqueNewCharacters);
                        localStorage.setItem('cached_characters', JSON.stringify(allCharacters));
                        localStorage.setItem('characters_cache_time', Date.now().toString());
                        localStorage.setItem('data_sync_timestamp', Date.now().toString());
                        
                        console.log('✅ 自动同步完成！新增 ' + uniqueNewCharacters.length + ' 个，总计 ' + allCharacters.length + ' 个');
                        
                        // 显示提示并刷新
                        if (confirm('🎉 检测到新角色数据！\\n新增 ' + uniqueNewCharacters.length + ' 个角色\\n\\n是否刷新页面查看？')) {
                            window.location.reload();
                        }
                    }
                    
                    // 清理同步标记
                    localStorage.removeItem('aiko_latest_sync');
                    localStorage.removeItem(latestSync);
                }
            }
        } catch (error) {
            console.error('❌ 自动检查失败:', error);
        }
    };
    
    // 立即检查
    autoCheckAndSync();
    
    // 定时检查
    setInterval(autoCheckAndSync, 30000);
    
    // 监听跨标签页事件
    window.addEventListener('storage', (e) => {
        if (e.key === 'aiko_latest_sync' && e.newValue) {
            console.log('📡 检测到同步信号');
            setTimeout(autoCheckAndSync, 1000);
        }
    });
    
    console.log('✅ 前端自动同步服务已启动');
})();
</script>
`;

console.log('前端自动同步代码已准备就绪');
console.log('请将以上脚本添加到前端应用的index.html中');
