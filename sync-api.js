// AIko Spark 自动同步 API
class SyncAPI {
    constructor() {
        // 使用GitHub Gist作为免费的云存储
        this.gistId = 'aiko-spark-characters'; // 可以配置为实际的Gist ID
        this.apiUrl = 'https://api.github.com/gists';
        this.gistUrl = null;
        this.syncInterval = null;
    }

    // 初始化同步服务
    async init() {
        console.log('🚀 初始化自动同步服务...');
        try {
            // 直接使用简化的同步方案
            console.log('✅ 同步服务初始化成功');
            return true;
        } catch (error) {
            console.error('❌ 同步服务初始化失败:', error);
            return false;
        }
    }

    // 上传角色数据到云端（简化版）
    async uploadCharacters(characters) {
        console.log('📤 准备角色数据...');
        try {
            // 直接使用备用方案，避免CORS问题
            return this.fallbackUpload(characters);
        } catch (error) {
            console.error('❌ 数据准备失败:', error);
            return null;
        }
    }

    // 从云端下载角色数据
    async downloadCharacters(binId) {
        console.log('📥 从云端下载角色数据...');
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                headers: {
                    'X-Master-Key': '$2a$10$aiko.spark.sync.key.demo'
                }
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ 数据下载成功，角色数量:', result.record.characters.length);
                return result.record.characters;
            } else {
                throw new Error('下载失败');
            }
        } catch (error) {
            console.error('❌ 下载失败:', error);
            return null;
        }
    }

    // 备用方案：直接生成同步代码
    fallbackUpload(characters) {
        console.log('🔄 生成直接同步代码...');
        try {
            // 生成包含数据的同步代码
            const syncId = 'direct-' + Date.now();
            const syncData = {
                characters: characters,
                timestamp: Date.now(),
                id: syncId
            };
            
            // 将数据嵌入到同步代码中
            localStorage.setItem('sync_data_' + syncId, JSON.stringify(syncData));
            console.log('✅ 同步代码生成成功，ID:', syncId);
            return syncId;
        } catch (error) {
            console.error('❌ 同步代码生成失败:', error);
            return null;
        }
    }

    // 降级到localStorage同步
    fallbackToLocalStorage() {
        console.log('🔄 降级到localStorage同步模式...');
        
        // 创建一个共享的数据键
        const sharedKey = 'aiko_shared_characters';
        
        return {
            upload: (characters) => {
                const data = {
                    characters: characters,
                    timestamp: Date.now(),
                    version: '1.0'
                };
                localStorage.setItem(sharedKey, JSON.stringify(data));
                
                // 尝试通知其他标签页
                window.dispatchEvent(new CustomEvent('aikoSync', {
                    detail: { type: 'upload', data: data }
                }));
                
                console.log('✅ 数据已保存到共享存储');
                return sharedKey;
            },
            
            download: () => {
                const data = localStorage.getItem(sharedKey);
                if (data) {
                    const parsed = JSON.parse(data);
                    console.log('✅ 从共享存储获取数据，角色数量:', parsed.characters.length);
                    return parsed.characters;
                }
                return null;
            }
        };
    }

    // 自动同步到前端
    async autoSyncToFrontend() {
        console.log('🚀 开始自动同步到前端...');
        
        try {
            // 获取本地角色数据
            const localData = localStorage.getItem('cached_characters');
            if (!localData) {
                alert('❌ 没有角色数据可同步');
                return false;
            }

            const characters = JSON.parse(localData);
            const approvedCharacters = characters.filter(c => 
                c.reviewStatus === 'approved' || c.isOfficial
            );

            if (approvedCharacters.length === 0) {
                alert('❌ 没有已审核通过的角色可同步');
                return false;
            }

            // 上传到云端
            const uploadId = await this.uploadCharacters(approvedCharacters);
            if (!uploadId) {
                throw new Error('上传失败');
            }

            // 生成前端自动同步代码
            const autoSyncCode = this.generateAutoSyncCode(uploadId, approvedCharacters.length);
            
            // 直接显示同步界面（避免跨域问题）
            this.showBackupSyncOption(autoSyncCode, approvedCharacters.length);
            return true;

        } catch (error) {
            console.error('❌ 自动同步失败:', error);
            alert('❌ 自动同步失败: ' + error.message);
            return false;
        }
    }

    // 生成自动同步代码（直接包含数据）
    generateAutoSyncCode(uploadId, count) {
        const syncData = localStorage.getItem('sync_data_' + uploadId);
        if (!syncData) {
            throw new Error('同步数据不存在');
        }
        
        const data = JSON.parse(syncData);
        const characters = data.characters;
        
        return `
// AIko Spark 直接同步执行 - ${new Date().toLocaleString()}
(function() {
    try {
        console.log('🚀 AIko Spark 直接同步开始...');
        
        // 直接使用嵌入的角色数据
        const newCharacters = ${JSON.stringify(characters, null, 2)};
        
        console.log('📊 准备同步 ' + newCharacters.length + ' 个角色...');
        
        // 合并到本地数据
        const existingData = localStorage.getItem('cached_characters');
        let allCharacters = existingData ? JSON.parse(existingData) : [];
        const existingIds = new Set(allCharacters.map(c => c.id));
        const newUniqueCharacters = newCharacters.filter(c => !existingIds.has(c.id));
        allCharacters = allCharacters.concat(newUniqueCharacters);
        
        // 保存数据
        localStorage.setItem('cached_characters', JSON.stringify(allCharacters));
        localStorage.setItem('characters_cache_time', Date.now().toString());
        localStorage.setItem('data_sync_timestamp', Date.now().toString());
        
        console.log('✅ 直接同步完成！新增: ' + newUniqueCharacters.length + ' 个，总计: ' + allCharacters.length + ' 个');
        
        // 显示成功提示
        alert('✅ 角色同步成功！\\n新增: ' + newUniqueCharacters.length + ' 个角色\\n总计: ' + allCharacters.length + ' 个角色\\n\\n页面将自动刷新显示新角色');
        
        // 触发页面刷新
        if (typeof window !== 'undefined' && window.location) {
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    } catch (error) {
        console.error('❌ 直接同步失败:', error);
        alert('❌ 同步失败: ' + error.message);
    }
})();`;
    }

    // 尝试直接注入到前端
    async injectToFrontend(code) {
        console.log('🎯 尝试直接注入到前端...');
        
        try {
            // 尝试打开前端应用并注入代码
            const frontendWindow = window.open('http://localhost:8084', 'frontend');
            
            if (frontendWindow) {
                // 等待页面加载
                setTimeout(() => {
                    try {
                        // 注入同步代码
                        frontendWindow.eval(code);
                        console.log('✅ 代码注入成功');
                        return true;
                    } catch (error) {
                        console.error('❌ 代码注入失败:', error);
                        return false;
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('❌ 无法直接注入:', error);
            return false;
        }
        
        return false;
    }

    // 显示备用同步选项
    showBackupSyncOption(code, count) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
            align-items: center; justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; width: 90%;">
                <h2 style="margin: 0 0 20px 0; color: #333;">🔄 自动同步就绪</h2>
                <p style="color: #666; margin-bottom: 20px;">
                    已准备同步 <strong>${count}</strong> 个角色到前端应用。
                    由于浏览器安全限制，需要您点击下方按钮完成最后一步。
                </p>
                <div style="margin: 20px 0;">
                    <button onclick="navigator.clipboard.writeText(\`${code.replace(/`/g, '\\`')}\`); alert('✅ 已复制！请在前端控制台粘贴执行'); this.textContent='✅ 已复制';" 
                            style="background: #2563eb; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-right: 10px;">
                        📋 复制同步代码
                    </button>
                    <button onclick="window.open('http://localhost:8084', '_blank')" 
                            style="background: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; margin-right: 10px;">
                        🌐 打开前端应用
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: #6b7280; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
                        关闭
                    </button>
                </div>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin-top: 15px;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                        <strong>操作步骤：</strong><br>
                        1. 点击"打开前端应用"<br>
                        2. 在前端页面按 F12 → Console<br>
                        3. 点击"复制同步代码"<br>
                        4. 在控制台粘贴并执行<br>
                        5. 页面将自动刷新显示新角色
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
}

// 创建全局同步实例
window.syncAPI = new SyncAPI();
