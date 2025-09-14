// AIko Spark 后台管理系统 JavaScript
class AdminSystem {
    constructor() {
        this.currentTab = 'csv';
        this.parsedData = [];
        this.importHistory = this.loadImportHistory();
        
        // 环境配置
        this.isProduction = window.location.hostname !== 'localhost' && 
                           window.location.hostname !== '127.0.0.1';
        this.version = '1.0.0';
        
        // 生产环境优化
        if (this.isProduction) {
            this.setupProductionMode();
        }
        
        this.init();
    }

    // 生产环境配置
    setupProductionMode() {
        // 禁用调试日志
        const originalLog = console.log;
        console.log = (...args) => {
            if (args[0] && args[0].includes('🔄') || args[0].includes('✅') || args[0].includes('❌')) {
                originalLog.apply(console, args);
            }
        };
        
        // 错误监控
        window.addEventListener('error', (e) => {
            this.logError('JavaScript Error', e.error?.message || e.message, e.filename, e.lineno);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.logError('Unhandled Promise Rejection', e.reason);
        });
        
        // 性能监控
        this.startPerformanceMonitoring();
        
        console.log('🚀 AIko Spark Admin System v' + this.version + ' (Production Mode)');
    }

    // 错误日志
    logError(type, message, file = '', line = '') {
        const errorInfo = {
            type,
            message,
            file,
            line,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // 存储错误日志
        const errorLogs = JSON.parse(localStorage.getItem('admin_error_logs') || '[]');
        errorLogs.push(errorInfo);
        
        // 只保留最近100条错误
        if (errorLogs.length > 100) {
            errorLogs.splice(0, errorLogs.length - 100);
        }
        
        localStorage.setItem('admin_error_logs', JSON.stringify(errorLogs));
        
        console.error('❌ Error logged:', errorInfo);
    }

    // 性能监控
    startPerformanceMonitoring() {
        // 监控内存使用
        setInterval(() => {
            if (performance.memory) {
                const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
                if (memoryUsage > 150) { // 超过150MB警告
                    console.warn('⚠️ High memory usage:', memoryUsage.toFixed(2) + 'MB');
                    this.showNotification('warning', '内存警告', '内存使用较高，建议刷新页面');
                }
            }
        }, 60000); // 每分钟检查一次
        
        // 监控localStorage使用
        this.checkStorageUsage();
    }

    // 检查存储使用情况
    checkStorageUsage() {
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                }
            }
            
            const sizeInMB = totalSize / 1024 / 1024;
            if (sizeInMB > 4) { // localStorage通常限制5MB
                console.warn('⚠️ Storage usage high:', sizeInMB.toFixed(2) + 'MB');
                this.showNotification('warning', '存储警告', '本地存储使用较高，建议清理数据');
            }
        } catch (error) {
            console.error('❌ Storage check failed:', error);
        }
    }

    async init() {
        this.initLucideIcons();
        this.bindEvents();
        
        // 异步加载数据和更新统计
        await this.updateStats();
        this.renderImportHistory();
        this.loadPlaceholder();
    }

    // 初始化图标
    initLucideIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // 绑定事件
    bindEvents() {
        // 标签页切换
        document.querySelectorAll('.import-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 文件上传
        document.getElementById('file-upload').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

        // 拖拽上传
        const dropZone = document.querySelector('.border-dashed');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-400', 'bg-blue-50');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-400', 'bg-blue-50');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-400', 'bg-blue-50');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        // 按钮事件
        document.getElementById('parse-btn').addEventListener('click', () => this.parseData());
        document.getElementById('import-btn').addEventListener('click', () => this.importData());
        document.getElementById('template-btn').addEventListener('click', () => this.downloadTemplate());
        document.getElementById('view-characters-btn').addEventListener('click', () => this.viewUploadedCharacters());
        document.getElementById('sync-btn').addEventListener('click', () => this.syncToApp());
        document.getElementById('backup-btn').addEventListener('click', () => this.backupData());
        document.getElementById('clear-btn').addEventListener('click', () => this.clearData());
        
        // 添加测试按钮事件（开发模式）
        if (!this.isProduction) {
            this.addTestButton();
        }

        // 通知关闭
        document.getElementById('notification-close').addEventListener('click', () => {
            this.hideNotification();
        });
    }

    // 切换标签页
    switchTab(tab) {
        this.currentTab = tab;
        
        // 更新按钮状态
        document.querySelectorAll('.import-tab-btn').forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.className = 'import-tab-btn border-blue-500 text-blue-600 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm';
            } else {
                btn.className = 'import-tab-btn border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm';
            }
        });

        // 更新占位符
        this.loadPlaceholder();
    }

    // 加载占位符文本
    loadPlaceholder() {
        const textarea = document.getElementById('import-data');
        const placeholders = {
            csv: 'name,description,personality,prompt,tags,type,source,creator,imageUrl,isOfficial\n"小樱","魔卡少女樱主角","开朗勇敢","你是木之本樱...","魔法,少女","动漫","魔卡少女樱","CLAMP","",true',
            feishu: '角色名,角色描述,性格特点,提示词,标签,角色类型,来源作品,创作者,头像URL,是否官方\n"小樱","魔卡少女樱主角","开朗勇敢","你是木之本樱...","魔法;少女","动漫","魔卡少女樱","CLAMP","",是',
            json: '[\n  {\n    "name": "小樱",\n    "description": "魔卡少女樱主角",\n    "personality": "开朗勇敢",\n    "prompt": "你是木之本樱...",\n    "tags": ["魔法", "少女"],\n    "type": "动漫",\n    "source": "魔卡少女樱",\n    "creator": "CLAMP",\n    "isOfficial": true\n  }\n]'
        };
        
        textarea.placeholder = placeholders[this.currentTab] || '粘贴你的角色数据...';
    }

    // 处理文件上传
    handleFileUpload(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            document.getElementById('import-data').value = content;
            
            // 根据文件类型自动切换标签
            if (file.name.endsWith('.json')) {
                this.switchTab('json');
            } else if (file.name.endsWith('.csv')) {
                // 检查是否是飞书格式
                if (content.includes('角色名') || content.includes('角色描述')) {
                    this.switchTab('feishu');
                } else {
                    this.switchTab('csv');
                }
            }

            this.showNotification('success', '文件上传成功', `已读取文件: ${file.name}`);
        };
        
        reader.readAsText(file, 'UTF-8');
    }

    // 解析数据
    parseData() {
        const data = document.getElementById('import-data').value.trim();
        if (!data) {
            this.showNotification('error', '解析失败', '请输入要解析的数据');
            return;
        }

        try {
            // 预处理数据
            const preprocessedData = this.preprocessData(data);
            let parsed = [];
            
            if (this.currentTab === 'json') {
                parsed = this.parseJSON(preprocessedData);
            } else if (this.currentTab === 'feishu') {
                parsed = this.parseFeishuCSV(preprocessedData);
            } else {
                parsed = this.parseCSV(preprocessedData);
            }

            this.parsedData = parsed;
            
            console.log('📊 解析完成，准备渲染预览:', {
                解析数据长度: parsed.length,
                数据样例: parsed[0]
            });
            
            this.renderPreview(parsed);
            
            document.getElementById('import-btn').disabled = false;
            this.showNotification('success', '解析成功', `成功解析 ${parsed.length} 个角色`);
            
        } catch (error) {
            console.error('❌ 解析失败:', error);
            
            // 提供更详细的错误信息和修复建议
            let errorMessage = error.message;
            let suggestions = [];
            
            if (error.message.includes('字段数量不匹配')) {
                suggestions.push('检查CSV中是否有多余的逗号或缺少引号');
                suggestions.push('确保每行的字段数量与表头一致');
            } else if (error.message.includes('表头和一行数据')) {
                suggestions.push('确保至少有表头行和一行数据');
                suggestions.push('检查是否有空行在开头或结尾');
            } else if (error.message.includes('没有成功解析')) {
                suggestions.push('检查必填字段（角色名）是否为空');
                suggestions.push('尝试下载模板文件对比格式');
            }
            
            if (suggestions.length > 0) {
                errorMessage += '\n\n修复建议:\n' + suggestions.map(s => '• ' + s).join('\n');
            }
            
            this.showNotification('error', '解析失败', errorMessage);
            
            // 显示调试信息
            this.showDebugInfo(data);
        }
    }

    // 数据预处理
    preprocessData(data) {
        // 移除BOM标记
        if (data.charCodeAt(0) === 0xFEFF) {
            data = data.substring(1);
        }
        
        // 标准化换行符
        data = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // 移除多余的空行
        data = data.replace(/\n\s*\n/g, '\n');
        
        return data.trim();
    }

    // CSV预处理
    preprocessCSV(csvText) {
        // 基础预处理
        csvText = this.preprocessData(csvText);
        
        // 修复常见的CSV格式问题
        csvText = this.fixCommonCSVIssues(csvText);
        
        return csvText;
    }

    // 修复常见CSV问题
    fixCommonCSVIssues(csvText) {
        // 修复不匹配的引号
        csvText = this.fixUnmatchedQuotes(csvText);
        
        // 标准化分隔符
        csvText = this.standardizeSeparators(csvText);
        
        return csvText;
    }

    // 修复不匹配的引号
    fixUnmatchedQuotes(text) {
        const lines = text.split('\n');
        return lines.map(line => {
            // 统计引号数量
            const quoteCount = (line.match(/"/g) || []).length;
            
            // 如果引号数量是奇数，在行末添加引号
            if (quoteCount % 2 !== 0) {
                console.warn('⚠️ 修复不匹配的引号:', line.substring(0, 50) + '...');
                return line + '"';
            }
            
            return line;
        }).join('\n');
    }

    // 标准化分隔符
    standardizeSeparators(text) {
        // 检测主要分隔符
        const separators = [',', ';', '\t', '，', '；'];
        let mainSeparator = ',';
        let maxCount = 0;
        
        for (const sep of separators) {
            const count = (text.match(new RegExp('\\' + sep, 'g')) || []).length;
            if (count > maxCount) {
                maxCount = count;
                mainSeparator = sep;
            }
        }
        
        // 如果主分隔符不是逗号，替换为逗号
        if (mainSeparator !== ',') {
            console.log('📋 标准化分隔符:', mainSeparator, '→ ,');
            text = text.replace(new RegExp('\\' + mainSeparator, 'g'), ',');
        }
        
        return text;
    }

    // 检测编码
    detectEncoding(text) {
        if (text.charCodeAt(0) === 0xFEFF) return 'UTF-8 with BOM';
        if (/[\u4e00-\u9fa5]/.test(text)) return 'UTF-8 (含中文)';
        return 'UTF-8';
    }

    // 检测分隔符
    detectSeparator(line) {
        const separators = {
            ',': (line.match(/,/g) || []).length,
            ';': (line.match(/;/g) || []).length,
            '\t': (line.match(/\t/g) || []).length,
            '，': (line.match(/，/g) || []).length,
            '；': (line.match(/；/g) || []).length
        };
        
        const maxSep = Object.keys(separators).reduce((a, b) => 
            separators[a] > separators[b] ? a : b
        );
        
        return `${maxSep} (${separators[maxSep]}个)`;
    }

    // 智能表头修复
    fixHeaders(originalHeaders, lines) {
        // 如果原始表头看起来不像标准字段名，尝试生成标准表头
        const hasStandardHeaders = originalHeaders.some(header => 
            ['name', 'description', 'personality', 'prompt', 'tags', 'type', 'source', 'creator', '角色名', '角色描述'].includes(header.toLowerCase().trim())
        );

        if (!hasStandardHeaders && lines.length > 1) {
            console.log('🔧 检测到非标准表头，使用智能表头生成');
            
            // 分析第一行数据来推断字段数量
            const firstDataLine = this.parseCSVLine(lines[1]);
            const fieldCount = firstDataLine.length;
            
            console.log('📊 数据行字段数量:', fieldCount);
            
            // 生成标准表头
            const standardHeaders = [
                'name',           // 角色名
                'description',    // 角色描述  
                'personality',    // 性格特点
                'prompt',         // 提示词
                'tags',           // 标签
                'type',           // 角色类型
                'source',         // 来源作品
                'creator',        // 创作者
                'imageUrl',       // 头像URL
                'isOfficial'      // 是否官方
            ];
            
            // 如果数据字段更多，添加额外字段
            const headers = [...standardHeaders];
            for (let i = standardHeaders.length; i < fieldCount; i++) {
                headers.push(`field${i + 1}`);
            }
            
            // 只返回与数据行字段数量匹配的表头
            return headers.slice(0, fieldCount);
        }
        
        return originalHeaders;
    }

    // 显示调试信息
    showDebugInfo(data) {
        if (this.isProduction) return;
        
        const lines = data.split('\n');
        console.log('🔍 调试信息:', {
            原始数据长度: data.length,
            行数: lines.length,
            前3行: lines.slice(0, 3),
            是否包含引号: data.includes('"'),
            是否包含中文: /[\u4e00-\u9fa5]/.test(data),
            字符编码检测: data.charCodeAt(0)
        });
    }

    // 解析JSON数据
    parseJSON(jsonText) {
        const data = JSON.parse(jsonText);
        if (!Array.isArray(data)) {
            throw new Error('JSON数据必须是数组格式');
        }
        return data.map(item => this.normalizeCharacterData(item));
    }

    // 解析CSV数据 - 多行文本支持版本
    parseCSV(csvText) {
        if (!csvText || typeof csvText !== 'string') {
            throw new Error('CSV数据不能为空');
        }

        // 初始化跳过原因统计
        this.skipReasons = {
            emptyLine: 0,
            fieldCountMismatch: 0,
            missingName: 0,
            processingError: 0
        };

        // 预处理和格式检测
        csvText = this.preprocessCSV(csvText);
        
        console.log('🔍 开始解析多行CSV数据...');
        
        // 使用更智能的CSV行分割方法
        const lines = this.parseCSVRows(csvText);
        
        if (lines.length < 2) {
            throw new Error('CSV数据至少需要表头和一行数据');
        }

        console.log('📊 开始解析CSV数据:', {
            总行数: lines.length,
            表头行: lines[0].substring(0, 200) + (lines[0].length > 200 ? '...' : ''),
            数据编码: this.detectEncoding(csvText),
            分隔符类型: this.detectSeparator(lines[0])
        });

        let headers = this.parseCSVLine(lines[0]);
        const characters = [];
        let successCount = 0;
        let skipCount = 0;

        console.log('📋 原始表头字段:', headers);
        
        // 智能表头检测和修复
        headers = this.fixHeaders(headers, lines);
        
        console.log('📋 修复后表头字段:', headers);
        
        // 验证表头
        if (headers.length === 0) {
            throw new Error('未检测到有效的表头字段');
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) {
                this.skipReasons.emptyLine++;
                continue; // 跳过空行
            }

            const values = this.parseCSVLine(line);
            
            // 调试信息
            if (!this.isProduction && i <= 3) {
                console.log(`📝 第${i}行数据:`, {
                    原始行: line.substring(0, 100) + (line.length > 100 ? '...' : ''),
                    解析值: values,
                    字段数量: values.length,
                    表头数量: headers.length
                });
            }

            // 检查字段数量匹配 - 允许数据行字段更多，但不能少于表头
            if (values.length < headers.length) {
                console.warn(`⚠️ 第${i}行字段数量不足: 期望至少${headers.length}个，实际${values.length}个`);
                console.warn(`📝 第${i}行内容预览:`, line.substring(0, 200) + '...');
                console.warn(`📝 第${i}行解析结果:`, values);
                this.skipReasons.fieldCountMismatch++;
                skipCount++;
                continue;
            } else if (values.length > headers.length) {
                console.log(`📝 第${i}行字段数量多于表头: 表头${headers.length}个，数据${values.length}个，将使用前${headers.length}个字段`);
                // 只取前N个字段，N为表头字段数量
                values = values.slice(0, headers.length);
            }

            try {
                const character = {};
                headers.forEach((header, index) => {
                    character[header.trim()] = values[index];
                });

                const normalizedCharacter = this.normalizeCharacterData(character);
                
                // 验证必要字段
                if (!normalizedCharacter.name || normalizedCharacter.name.trim() === '') {
                    console.warn(`⚠️ 第${i}行缺少角色名称，跳过`);
                    this.skipReasons.missingName++;
                    skipCount++;
                    continue;
                }

                characters.push(normalizedCharacter);
                successCount++;
            } catch (error) {
                console.error(`❌ 第${i}行数据处理失败:`, error);
                this.skipReasons.processingError++;
                skipCount++;
            }
        }

        console.log('✅ CSV解析完成:', {
            原始行数: lines.length,
            表头行: 1,
            数据行数: lines.length - 1,
            成功解析: successCount,
            跳过行数: skipCount,
            总角色数: characters.length,
            跳过原因统计: this.getSkipReasons()
        });

        // 计算预期vs实际差异
        const expectedDataRows = lines.length - 1; // 减去表头
        const actualCharacters = characters.length;
        const difference = expectedDataRows - actualCharacters;
        
        console.log('📈 数量分析:', {
            预期角色数: expectedDataRows,
            实际角色数: actualCharacters,
            差异数量: difference,
            成功率: `${((actualCharacters / expectedDataRows) * 100).toFixed(1)}%`
        });

        // 用户报告的实际角色数量
        const userReportedCount = 560;
        if (actualCharacters < userReportedCount) {
            console.warn('⚠️ 用户报告差异:', {
                用户期望: userReportedCount,
                实际解析: actualCharacters,
                缺失数量: userReportedCount - actualCharacters,
                缺失率: `${(((userReportedCount - actualCharacters) / userReportedCount) * 100).toFixed(1)}%`
            });
        }

        // 详细统计信息
        this.logDetailedStats(lines, characters);

        // 如果角色数量明显少于预期，启用深度调试
        if (actualCharacters < userReportedCount * 0.8) {
            console.log('🔍 启用深度调试模式...');
            this.deepDebugMissingCharacters(lines, characters, headers);
        }

        if (characters.length === 0) {
            throw new Error('没有成功解析到任何角色数据，请检查CSV格式是否正确');
        }

        return characters;
    }

    // 解析飞书CSV数据
    parseFeishuCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('飞书数据至少需要表头和一行数据');
        }

        const headers = this.parseCSVLine(lines[0]);
        const characters = [];

        // 飞书字段映射
        const fieldMap = {
            '角色名': 'name',
            '角色描述': 'description',
            '性格特点': 'personality',
            '提示词': 'prompt',
            '标签': 'tags',
            '角色类型': 'type',
            '来源作品': 'source',
            '创作者': 'creator',
            '头像URL': 'imageUrl',
            '是否官方': 'isOfficial'
        };

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length !== headers.length) continue;

            const character = {};
            headers.forEach((header, index) => {
                const mappedField = fieldMap[header] || header;
                character[mappedField] = values[index];
            });

            characters.push(this.normalizeCharacterData(character));
        }

        return characters;
    }

    // 解析CSV行 - 智能版本（处理无引号CSV）
    parseCSVLine(line) {
        if (!line || line.trim() === '') return [];
        
        // 检测是否为无引号格式的CSV
        const hasQuotes = line.includes('"') || line.includes('"') || line.includes('"');
        
        if (!hasQuotes) {
            // 无引号CSV的智能分割
            return this.parseUnquotedCSV(line);
        }
        
        // 有引号的标准CSV解析
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        // 预处理：处理不同的引号类型
        line = line.replace(/[""]/g, '"'); // 统一引号类型
        
        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes) {
                    if (nextChar === '"') {
                        // 转义的双引号 ""
                        current += '"';
                        i += 2;
                        continue;
                    } else {
                        // 结束引号
                        inQuotes = false;
                    }
                } else {
                    // 开始引号
                    inQuotes = true;
                }
            } else if ((char === ',' || char === '，') && !inQuotes) {
                // 字段分隔符 (支持中英文逗号)
                result.push(this.cleanCSVValue(current));
                current = '';
                i++;
                continue;
            } else if ((char === ';' || char === '；') && !inQuotes) {
                // 分号分隔符 (某些CSV使用分号)
                result.push(this.cleanCSVValue(current));
                current = '';
                i++;
                continue;
            } else if (char === '\t' && !inQuotes) {
                // Tab分隔符 (TSV格式)
                result.push(this.cleanCSVValue(current));
                current = '';
                i++;
                continue;
            } else {
                current += char;
            }
            i++;
        }
        
        // 添加最后一个字段
        result.push(this.cleanCSVValue(current));
        
        // 过滤空字段（但保留有意义的空值）
        const filteredResult = result.map(field => field === undefined ? '' : field);
        
        // 调试日志
        console.log('📊 CSV行解析详情:', {
            原始行长度: line.length,
            原始行: line.substring(0, 200) + (line.length > 200 ? '...' : ''),
            解析结果: filteredResult,
            字段数量: filteredResult.length,
            包含引号: line.includes('"'),
            解析方式: hasQuotes ? '标准CSV' : '无引号CSV'
        });
        
        return filteredResult;
    }

    // 解析无引号CSV（智能分割）- 优先制表符版本
    parseUnquotedCSV(line) {
        console.log('🔧 使用无引号CSV解析模式');
        
        // 优先检测制表符，因为用户数据是表格格式
        const separators = ['\t', ',', '，', ';', '；'];
        let bestSeparator = '\t';
        let maxCount = 0;
        
        for (const sep of separators) {
            let count;
            if (sep === '\t') {
                // 制表符需要特殊处理
                count = (line.match(/\t/g) || []).length;
            } else {
                count = (line.match(new RegExp('\\' + sep, 'g')) || []).length;
            }
            
            if (count > maxCount) {
                maxCount = count;
                bestSeparator = sep;
            }
        }
        
        const separatorName = bestSeparator === '\t' ? 'Tab制表符' : bestSeparator;
        console.log('🎯 检测到分隔符:', separatorName, '出现', maxCount, '次');
        
        // 分割字段
        let fields = line.split(bestSeparator);
        
        // 清理字段（去除多余空格和特殊字符）
        fields = fields.map(field => this.cleanCSVValue(field));
        
        console.log('📋 无引号CSV解析结果:', {
            字段数量: fields.length,
            前3个字段: fields.slice(0, 3),
            分隔符类型: separatorName
        });
        
        return fields;
    }

    // 清理CSV值 - 增强版本
    cleanCSVValue(value) {
        if (typeof value !== 'string') return '';
        
        // 去除首尾空白
        value = value.trim();
        
        // 去除各种类型的引号
        const quoteTypes = ['"', '"', '"', "'", "'"];
        for (const quote of quoteTypes) {
            if (value.startsWith(quote) && value.endsWith(quote) && value.length > 1) {
                value = value.slice(1, -1);
                break;
            }
        }
        
        // 处理转义字符
        value = value.replace(/""/g, '"'); // 双引号转义
        value = value.replace(/\\"/g, '"'); // 反斜杠转义
        value = value.replace(/\\n/g, '\n'); // 换行符
        value = value.replace(/\\t/g, '\t'); // Tab符
        
        // 再次清理空白
        value = value.trim();
        
        return value;
    }

    // 规范化角色数据
    normalizeCharacterData(rawData) {
        // 处理标签
        let tags = [];
        if (rawData.tags) {
            if (typeof rawData.tags === 'string') {
                tags = rawData.tags.split(/[,，;；|｜]/).map(t => t.trim()).filter(t => t);
            } else if (Array.isArray(rawData.tags)) {
                tags = rawData.tags;
            }
        }

        // 处理类型映射
        const typeMap = {
            '游戏': '游戏', 'game': '游戏', 'Game': '游戏',
            '动漫': '动漫', 'anime': '动漫', 'Anime': '动漫', '动画': '动漫',
            '真人': '真人', 'real': '真人', 'Real': '真人',
            '虚拟偶像': '虚拟偶像', 'virtual': '虚拟偶像', 'vtuber': '虚拟偶像'
        };

        // 处理是否官方
        let isOfficial = false;
        const officialValue = rawData.isOfficial || rawData.是否官方;
        if (typeof officialValue === 'boolean') {
            isOfficial = officialValue;
        } else if (typeof officialValue === 'string') {
            isOfficial = officialValue.toLowerCase() === 'true' || 
                         officialValue === '是' || 
                         officialValue === '1';
        }

        return {
            id: this.generateId(),
            name: (rawData.name || rawData.角色名 || '').trim(),
            description: (rawData.description || rawData.角色描述 || '').trim(),
            personality: (rawData.personality || rawData.性格特点 || '友好、乐于助人').trim(),
            prompt: (rawData.prompt || rawData.提示词 || '').trim(),
            tags: tags.length > 0 ? tags : ['导入角色'],
            type: typeMap[rawData.type || rawData.角色类型] || '其他',
            source: (rawData.source || rawData.来源作品 || '导入数据').trim(),
            creator: (rawData.creator || rawData.创作者 || '数据导入').trim(),
            imageUrl: rawData.imageUrl || rawData.头像URL || this.getDefaultImage(),
            isOfficial: isOfficial,
            category: isOfficial ? 'official' : 'community',
            isFavorited: false,
            reviewStatus: 'pending'
        };
    }

    // 生成ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // 获取默认头像
    getDefaultImage() {
        const defaultImages = [
            '/src/assets/character-1.jpg',
            '/src/assets/character-2.jpg',
            '/src/assets/character-3.jpg',
            '/src/assets/character-4.jpg',
            '/src/assets/character-5.jpg',
        ];
        return defaultImages[Math.floor(Math.random() * defaultImages.length)];
    }

    // 渲染预览 - 增强版本
    renderPreview(characters) {
        const previewDiv = document.getElementById('preview-content');
        
        console.log('🖼️ 开始渲染预览:', {
            角色数量: characters.length,
            前3个角色: characters.slice(0, 3).map(c => ({
                名称: c.name,
                描述: c.description,
                标签: c.tags,
                类型: c.type
            }))
        });
        
        if (!previewDiv) {
            console.error('❌ 找不到预览容器元素 #preview-content');
            return;
        }
        
        if (characters.length === 0) {
            previewDiv.innerHTML = '<div class="text-gray-500">暂无数据预览</div>';
            return;
        }

        try {
            const previewHtml = characters.slice(0, 3).map((char, index) => {
                // 安全处理字符串，防止undefined
                const safeName = (char.name || '未命名角色').toString();
                const safeDescription = (char.description || '无描述').toString();
                const safeType = (char.type || '其他').toString();
                const safeTags = Array.isArray(char.tags) ? char.tags : ['无标签'];
                
                console.log(`📋 渲染角色 ${index + 1}:`, {
                    原始数据: char,
                    处理后: { safeName, safeDescription, safeType, safeTags }
                });
                
                return `
                <div class="border rounded-lg p-3 mb-3 bg-gray-50">
                    <div class="flex items-center mb-2">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                            <span class="text-xs font-medium text-blue-600">${safeName.charAt(0)}</span>
                        </div>
                        <div>
                            <h4 class="font-medium text-sm">${this.escapeHtml(safeName)}</h4>
                            <p class="text-xs text-gray-500">${this.escapeHtml(safeType)}</p>
                        </div>
                    </div>
                    <p class="text-xs text-gray-600 line-clamp-2">${this.escapeHtml(safeDescription)}</p>
                    <div class="mt-2 flex flex-wrap gap-1">
                        ${safeTags.slice(0, 2).map(tag => 
                            `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">${this.escapeHtml(tag)}</span>`
                        ).join('')}
                        ${safeTags.length > 2 ? `<span class="text-xs text-gray-500">+${safeTags.length - 2}</span>` : ''}
                    </div>
                </div>
            `;
            }).join('');

            const finalHtml = `
                <div class="space-y-2">
                    ${previewHtml}
                    ${characters.length > 3 ? `<div class="text-xs text-gray-500 text-center">还有 ${characters.length - 3} 个角色...</div>` : ''}
                </div>
            `;
            
            previewDiv.innerHTML = finalHtml;
            console.log('✅ 预览渲染完成');
            
        } catch (error) {
            console.error('❌ 预览渲染失败:', error);
            previewDiv.innerHTML = `<div class="text-red-500">预览渲染失败: ${error.message}</div>`;
        }
    }

    // HTML转义函数
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 导入数据
    async importData() {
        if (this.parsedData.length === 0) {
            this.showNotification('error', '导入失败', '没有可导入的数据');
            return;
        }

        const importBtn = document.getElementById('import-btn');
        const progressSection = document.getElementById('progress-section');
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const currentItem = document.getElementById('current-item');

        // 显示进度条
        progressSection.classList.remove('hidden');
        importBtn.disabled = true;

        let success = 0;
        let failed = 0;

        for (let i = 0; i < this.parsedData.length; i++) {
            const character = this.parsedData[i];
            const progress = Math.round((i + 1) / this.parsedData.length * 100);
            
            // 更新进度
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            currentItem.textContent = `正在导入: ${character.name}`;

            try {
                // 模拟导入过程
                await this.sleep(200);
                
                // 保存到localStorage (模拟数据库)
                this.saveCharacterToStorage(character);
                success++;
                
            } catch (error) {
                console.error('导入角色失败:', error);
                failed++;
            }
        }

        // 完成导入
        progressSection.classList.add('hidden');
        importBtn.disabled = false;

        // 记录导入历史
        const importRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            total: this.parsedData.length,
            success,
            failed,
            type: this.currentTab
        };
        
        this.importHistory.unshift(importRecord);
        this.saveImportHistory();
        this.renderImportHistory();
        this.updateStats();

        // 清空数据
        this.parsedData = [];
        document.getElementById('import-data').value = '';
        document.getElementById('preview-content').innerHTML = '<div class="text-gray-500">暂无数据预览</div>';

        this.showNotification('success', '导入完成', 
            `成功导入 ${success} 个角色${failed > 0 ? `，失败 ${failed} 个` : ''}`);
    }

    // 保存角色到存储（API + localStorage）
    async saveCharacterToStorage(character) {
        try {
            // 获取现有角色
            const existingCharacters = await this.loadCharactersFromAPI();
            existingCharacters.push(character);
            
            // 保存到API
            const success = await this.saveCharactersToAPI(existingCharacters);
            
            if (success) {
                console.log('✅ 角色已保存到API和本地存储');
            } else {
                console.warn('⚠️ API保存失败，仅保存到本地存储');
            }
        } catch (error) {
            console.error('❌ 保存角色失败:', error);
            
            // 降级到localStorage
            const existingCharacters = JSON.parse(localStorage.getItem('cached_characters') || '[]');
            existingCharacters.push(character);
            localStorage.setItem('cached_characters', JSON.stringify(existingCharacters));
        }
    }

    // 渲染导入历史
    renderImportHistory() {
        const historyDiv = document.getElementById('import-history');
        
        if (this.importHistory.length === 0) {
            historyDiv.innerHTML = '<div class="text-sm text-gray-500">暂无导入记录</div>';
            return;
        }

        const historyHtml = this.importHistory.slice(0, 5).map(record => `
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                    <div class="text-sm font-medium">${record.success}/${record.total} 个角色</div>
                    <div class="text-xs text-gray-500">${this.formatDate(record.timestamp)}</div>
                </div>
                <div class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">${record.type}</div>
            </div>
        `).join('');

        historyDiv.innerHTML = historyHtml;
    }

    // 从前端API获取角色数据
    async loadCharactersFromAPI() {
        try {
            console.log('🔄 从前端API获取角色数据...');
            
            const response = await fetch('https://aiko-spark-sync.vercel.app/api/characters');
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.data && result.data.characters) {
                    const characters = result.data.characters;
                    console.log('✅ 从API获取到角色数据:', characters.length, '个');
                    
                    // 保存到localStorage（保持兼容性）
                    localStorage.setItem('cached_characters', JSON.stringify(characters));
                    localStorage.setItem('characters_cache_time', Date.now().toString());
                    localStorage.setItem('data_source', 'api');
                    
                    return characters;
                } else {
                    console.warn('⚠️ API返回格式异常:', result);
                }
            } else {
                console.warn('⚠️ API请求失败:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('❌ API获取失败:', error);
        }
        
        // 降级到localStorage
        const localData = localStorage.getItem('cached_characters');
        if (localData) {
            try {
                const characters = JSON.parse(localData);
                console.log('📦 使用本地缓存数据:', characters.length, '个角色');
                return characters;
            } catch (parseError) {
                console.error('❌ 本地数据解析失败:', parseError);
            }
        }
        
        console.log('⚠️ 没有可用的角色数据');
        return [];
    }

    // 保存角色数据到前端API
    async saveCharactersToAPI(characters) {
        try {
            console.log('🔄 保存角色数据到前端API...');
            
            const response = await fetch('https://aiko-spark-sync.vercel.app/api/characters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    characters: characters,
                    source: 'aiko-spark-admin'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ 保存成功:', result.message);
                    
                    // 同时保存到localStorage（保持兼容性）
                    localStorage.setItem('cached_characters', JSON.stringify(characters));
                    localStorage.setItem('characters_cache_time', Date.now().toString());
                    
                    return true;
                } else {
                    console.error('❌ API保存失败:', result.error);
                }
            } else {
                console.error('❌ API请求失败:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('❌ API保存异常:', error);
        }
        
        // 降级到localStorage
        try {
            localStorage.setItem('cached_characters', JSON.stringify(characters));
            localStorage.setItem('characters_cache_time', Date.now().toString());
            console.log('📦 已保存到本地缓存');
            return true;
        } catch (storageError) {
            console.error('❌ 本地保存失败:', storageError);
            return false;
        }
    }

    // 更新统计数据
    async updateStats() {
        // 优先从API获取最新数据
        const characters = await this.loadCharactersFromAPI();
        
        document.getElementById('totalCharacters').textContent = characters.length;
        document.getElementById('approvedCharacters').textContent = 
            characters.filter(c => c.reviewStatus === 'approved').length;
        document.getElementById('pendingCharacters').textContent = 
            characters.filter(c => c.reviewStatus === 'pending').length;
        
        // 计算真实对话次数
        const totalChats = this.calculateRealChatCount();
        document.getElementById('totalChats').textContent = totalChats;
    }

    // 计算真实对话次数
    calculateRealChatCount() {
        try {
            let totalCount = 0;
            
            // 遍历localStorage中所有以chat_history_开头的键
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                
                if (key && key.startsWith('chat_history_')) {
                    try {
                        const chatHistory = JSON.parse(localStorage.getItem(key) || '[]');
                        
                        if (Array.isArray(chatHistory)) {
                            // 计算用户消息数量（不包括AI回复）
                            const userMessages = chatHistory.filter(msg => msg.role === 'user');
                            totalCount += userMessages.length;
                        }
                    } catch (parseError) {
                        console.warn('解析聊天历史失败:', key, parseError);
                    }
                }
            }
            
            console.log('📊 计算得到的真实对话次数:', totalCount);
            return totalCount;
            
        } catch (error) {
            console.error('❌ 计算对话次数失败:', error);
            
            // 降级到估算值
            const characters = JSON.parse(localStorage.getItem('cached_characters') || '[]');
            const estimatedCount = Math.floor(characters.length * 0.8); // 更保守的估算
            console.log('📊 使用估算对话次数:', estimatedCount);
            return estimatedCount;
        }
    }

    // 查看已上传的角色
    async viewUploadedCharacters() {
        const characters = await this.loadCharactersFromAPI();
        
        if (characters.length === 0) {
            this.showNotification('warning', '没有数据', '当前没有已上传的角色数据');
            return;
        }
        
        // 创建角色查看模态框
        const modalHtml = `
            <div id="characters-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" style="z-index: 10000;">
                <div class="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-gray-900">已上传角色列表 (${characters.length} 个)</h3>
                        <button onclick="document.getElementById('characters-modal').remove()" class="text-gray-400 hover:text-gray-600">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                    
                    <div class="mb-4 flex gap-4">
                        <input type="text" id="character-search" placeholder="搜索角色..." class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <select id="character-filter" class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">全部类型</option>
                            <option value="动漫">动漫</option>
                            <option value="游戏">游戏</option>
                            <option value="真人">真人</option>
                            <option value="虚拟偶像">虚拟偶像</option>
                            <option value="其他">其他</option>
                        </select>
                    </div>
                    
                    <div class="max-h-96 overflow-y-auto">
                        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3" id="characters-grid">
                            ${this.renderCharacterCards(characters)}
                        </div>
                    </div>
                    
                    <div class="mt-4 flex justify-between items-center">
                        <div class="text-sm text-gray-600">
                            显示 ${characters.length} 个角色
                        </div>
                        <div class="flex gap-2">
                            <button onclick="window.adminSystem.exportCharacters()" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                                导出数据
                            </button>
                            <button onclick="document.getElementById('characters-modal').remove()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 重新初始化图标
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
        
        // 添加搜索和过滤功能
        this.setupCharacterSearch(characters);
    }
    
    // 渲染角色卡片
    renderCharacterCards(characters) {
        return characters.map(char => `
            <div class="character-card bg-gray-50 p-4 rounded-lg border hover:shadow-md transition-shadow" data-type="${char.type || ''}" data-name="${(char.name || '').toLowerCase()}">
                <div class="flex items-start gap-3">
                    <img src="${char.imageUrl || char.avatar || '/placeholder.svg'}" alt="${char.name || '未知'}" class="w-12 h-12 rounded-lg object-cover bg-gray-200">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-gray-900 truncate">${char.name || '未命名角色'}</h4>
                        <p class="text-sm text-gray-600 truncate">${char.description || '暂无描述'}</p>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">${char.type || '其他'}</span>
                            <span class="px-2 py-1 ${char.reviewStatus === 'approved' ? 'bg-green-100 text-green-800' : char.reviewStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'} text-xs rounded">
                                ${char.reviewStatus === 'approved' ? '已审核' : char.reviewStatus === 'pending' ? '待审核' : '已拒绝'}
                            </span>
                        </div>
                        ${char.tags && char.tags.length > 0 ? `
                            <div class="mt-2">
                                ${char.tags.slice(0, 3).map(tag => `<span class="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded mr-1">${tag}</span>`).join('')}
                                ${char.tags.length > 3 ? `<span class="text-xs text-gray-500">+${char.tags.length - 3}更多</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                    <div class="flex flex-col gap-2 ml-2">
                        <button onclick="adminSystem.editCharacter('${char.id}')" class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors" title="编辑角色">
                            <i data-lucide="edit" class="w-3 h-3"></i>
                        </button>
                        <button onclick="adminSystem.deleteCharacter('${char.id}')" class="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors" title="删除角色">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // 编辑角色
    async editCharacter(characterId) {
        try {
            const characters = await this.loadCharactersFromAPI();
            const character = characters.find(c => c.id === characterId);
            
            if (!character) {
                this.showNotification('error', '错误', '找不到指定的角色');
                return;
            }
            
            // 创建编辑模态框
            const editModalHtml = `
                <div id="edit-character-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" style="z-index: 20000;">
                    <div class="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-bold text-gray-900">编辑角色: ${character.name}</h3>
                            <button onclick="document.getElementById('edit-character-modal').remove()" class="text-gray-400 hover:text-gray-600">
                                <i data-lucide="x" class="w-6 h-6"></i>
                            </button>
                        </div>
                        
                        <form id="edit-character-form" class="space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">角色名称</label>
                                    <input type="text" id="edit-name" value="${character.name || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">角色类型</label>
                                    <select id="edit-type" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="游戏" ${character.type === '游戏' ? 'selected' : ''}>游戏</option>
                                        <option value="动漫" ${character.type === '动漫' ? 'selected' : ''}>动漫</option>
                                        <option value="其他" ${character.type === '其他' ? 'selected' : ''}>其他</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">来源</label>
                                    <input type="text" id="edit-source" value="${character.source || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">创建者</label>
                                    <input type="text" id="edit-creator" value="${character.creator || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">审核状态</label>
                                    <select id="edit-reviewStatus" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="pending" ${character.reviewStatus === 'pending' ? 'selected' : ''}>待审核</option>
                                        <option value="approved" ${character.reviewStatus === 'approved' ? 'selected' : ''}>已审核</option>
                                        <option value="rejected" ${character.reviewStatus === 'rejected' ? 'selected' : ''}>已拒绝</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">头像URL</label>
                                    <input type="url" id="edit-imageUrl" value="${character.imageUrl || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">角色描述</label>
                                <textarea id="edit-description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>${character.description || ''}</textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">性格特点</label>
                                <textarea id="edit-personality" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">${character.personality || ''}</textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">AI对话提示词</label>
                                <textarea id="edit-prompt" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">${character.prompt || ''}</textarea>
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">标签 (用逗号分隔)</label>
                                <input type="text" id="edit-tags" value="${(character.tags || []).join(', ')}" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="例如: 可爱, 活泼, 学生">
                            </div>
                            
                            <div class="flex justify-end gap-3 pt-4">
                                <button type="button" onclick="document.getElementById('edit-character-modal').remove()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                                    取消
                                </button>
                                <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                                    保存修改
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', editModalHtml);
            
            // 重新初始化图标
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // 绑定表单提交事件
            document.getElementById('edit-character-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveCharacterEdit(characterId);
            });
            
        } catch (error) {
            console.error('❌ 编辑角色失败:', error);
            this.showNotification('error', '错误', '编辑角色时发生错误');
        }
    }
    
    // 保存角色编辑
    async saveCharacterEdit(characterId) {
        try {
            const characters = await this.loadCharactersFromAPI();
            const characterIndex = characters.findIndex(c => c.id === characterId);
            
            if (characterIndex === -1) {
                this.showNotification('error', '错误', '找不到指定的角色');
                return;
            }
            
            // 获取表单数据
            const updatedCharacter = {
                ...characters[characterIndex],
                name: document.getElementById('edit-name').value.trim(),
                type: document.getElementById('edit-type').value,
                source: document.getElementById('edit-source').value.trim(),
                creator: document.getElementById('edit-creator').value.trim(),
                reviewStatus: document.getElementById('edit-reviewStatus').value,
                imageUrl: document.getElementById('edit-imageUrl').value.trim(),
                description: document.getElementById('edit-description').value.trim(),
                personality: document.getElementById('edit-personality').value.trim(),
                prompt: document.getElementById('edit-prompt').value.trim(),
                tags: document.getElementById('edit-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
            };
            
            // 验证必填字段
            if (!updatedCharacter.name || !updatedCharacter.description) {
                this.showNotification('error', '验证失败', '角色名称和描述不能为空');
                return;
            }
            
            // 更新角色数组
            characters[characterIndex] = updatedCharacter;
            
            // 保存到API
            const success = await this.saveCharactersToAPI(characters);
            
            if (success) {
                this.showNotification('success', '保存成功', `角色 "${updatedCharacter.name}" 已更新`);
                
                // 关闭编辑模态框
                document.getElementById('edit-character-modal').remove();
                
                // 刷新角色列表
                document.getElementById('characters-modal').remove();
                await this.viewUploadedCharacters();
                
                // 更新统计数据
                await this.updateStats();
            } else {
                this.showNotification('error', '保存失败', '无法保存角色修改');
            }
            
        } catch (error) {
            console.error('❌ 保存角色编辑失败:', error);
            this.showNotification('error', '错误', '保存时发生错误');
        }
    }
    
    // 删除角色
    async deleteCharacter(characterId) {
        try {
            const characters = await this.loadCharactersFromAPI();
            const character = characters.find(c => c.id === characterId);
            
            if (!character) {
                this.showNotification('error', '错误', '找不到指定的角色');
                return;
            }
            
            if (!confirm(`确定要删除角色 "${character.name}" 吗？此操作不可恢复！`)) {
                return;
            }
            
            // 从数组中移除角色
            const updatedCharacters = characters.filter(c => c.id !== characterId);
            
            // 保存到API
            const success = await this.saveCharactersToAPI(updatedCharacters);
            
            if (success) {
                this.showNotification('success', '删除成功', `角色 "${character.name}" 已删除`);
                
                // 刷新角色列表
                document.getElementById('characters-modal').remove();
                await this.viewUploadedCharacters();
                
                // 更新统计数据
                await this.updateStats();
            } else {
                this.showNotification('error', '删除失败', '无法删除角色');
            }
            
        } catch (error) {
            console.error('❌ 删除角色失败:', error);
            this.showNotification('error', '错误', '删除时发生错误');
        }
    }

    // 设置角色搜索和过滤
    setupCharacterSearch(characters) {
        const searchInput = document.getElementById('character-search');
        const filterSelect = document.getElementById('character-filter');
        const grid = document.getElementById('characters-grid');
        
        const filterCharacters = () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filterType = filterSelect.value;
            
            const filteredCharacters = characters.filter(char => {
                const matchesSearch = !searchTerm || 
                    (char.name || '').toLowerCase().includes(searchTerm) ||
                    (char.description || '').toLowerCase().includes(searchTerm) ||
                    (char.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));
                
                const matchesType = !filterType || char.type === filterType;
                
                return matchesSearch && matchesType;
            });
            
            grid.innerHTML = this.renderCharacterCards(filteredCharacters);
            
            // 更新计数
            const countEl = document.querySelector('#characters-modal .text-sm.text-gray-600');
            if (countEl) {
                countEl.textContent = `显示 ${filteredCharacters.length} 个角色`;
            }
        };
        
        searchInput.addEventListener('input', filterCharacters);
        filterSelect.addEventListener('change', filterCharacters);
    }
    
    // 导出角色数据
    async exportCharacters() {
        const characters = await this.loadCharactersFromAPI();
        const dataStr = JSON.stringify(characters, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `aiko_characters_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('success', '导出成功', `已导出 ${characters.length} 个角色数据`);
    }

    // 同步到应用
    async syncToApp() {
        this.showNotification('info', '同步中', '正在同步数据到前端应用...');
        
        try {
            const characters = await this.loadCharactersFromAPI();
            
            if (characters.length === 0) {
                this.showNotification('warning', '同步失败', '没有可同步的角色数据');
                return;
            }
            
            // 方案1：直接调用前端API同步数据（推荐）
            console.log('🔄 调用前端API同步数据...');
            
            const syncData = {
                characters: characters,
                timestamp: Date.now(),
                source: 'aiko-spark-admin',
                count: characters.length
            };
            
            try {
                // 调用前端API保存数据
                const apiResponse = await fetch('https://aiko-spark-sync.vercel.app/api/characters', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(syncData)
                });
                
                if (apiResponse.ok) {
                    const result = await apiResponse.json();
                    console.log('✅ API同步成功:', result);
                } else {
                    throw new Error(`API调用失败: ${apiResponse.status}`);
                }
            } catch (error) {
                console.error('❌ API同步失败:', error);
                // 降级到localStorage方案
                console.log('🔄 降级到localStorage + postMessage方案...');
            }
            
            // 备用方案：localStorage + postMessage
            const syncKey = 'aiko_sync_' + Date.now();
            localStorage.setItem(syncKey, JSON.stringify(syncData));
            localStorage.setItem('aiko_latest_sync', syncKey);
            
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'aiko_latest_sync',
                newValue: syncKey,
                oldValue: null
            }));
            
            console.log('✅ localStorage备用同步完成');
            
            // 打开前端应用
            const frontendUrl = `https://aiko-spark-sync.vercel.app/`;
            const frontendWindow = window.open(frontendUrl, '_blank');
            
            // 等待前端窗口加载后发送postMessage
            setTimeout(() => {
                if (frontendWindow && !frontendWindow.closed) {
                    frontendWindow.postMessage({
                        type: 'SYNC_CHARACTERS',
                        data: syncData
                    }, 'https://aiko-spark-sync.vercel.app');
                    console.log('📡 已通过postMessage发送数据到前端');
                }
            }, 3000);
            
            this.showNotification('success', '同步成功', 
                `已同步 ${characters.length} 个角色到前端应用，请检查新打开的标签页`);
            
            // 显示成功弹窗
            this.showSyncSuccessModal(frontendUrl, characters.length);
            
            // 模拟同步过程
            await this.sleep(1000);
            
            // 触发数据同步时间戳
            localStorage.setItem('data_sync_timestamp', Date.now().toString());
            
            // 显示同步成功提示，并提供跳转链接
            this.showSyncSuccessModal(frontendUrl, characters.length);
            
        } catch (error) {
            console.error('同步失败:', error);
            this.showNotification('error', '同步失败', '数据同步过程中出现错误');
        }
    }
    
    // 显示同步成功的模态框
    showSyncSuccessModal(frontendUrl, characterCount) {
        // 创建模态框HTML
        const modalHtml = `
            <div id="sync-success-modal" class="modal-overlay" style="
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.8); z-index: 10000;
                display: flex; align-items: center; justify-content: center;
            ">
                <div class="modal-content" style="
                    background: white; padding: 30px; border-radius: 12px;
                    max-width: 500px; width: 90%; text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                ">
                    <div style="color: #10b981; font-size: 48px; margin-bottom: 20px;">✅</div>
                    <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 24px;">数据已同步到前端！</h3>
                    <p style="color: #6b7280; margin-bottom: 20px;">
                        已成功同步 <strong>${characterCount}</strong> 个角色数据<br>
                        前端应用将在30秒内自动更新
                    </p>
                    <div style="margin-bottom: 25px;">
                        <p style="color: #374151; margin-bottom: 10px; font-weight: 500;">打开前端应用：</p>
                        <a href="${frontendUrl}" target="_blank" style="
                            color: #3b82f6; text-decoration: none; font-weight: 500;
                            word-break: break-all; font-size: 14px;
                        ">https://aiko-spark-sync.vercel.app</a>
                    </div>
                    <button onclick="document.getElementById('sync-success-modal').remove()" style="
                        background: #3b82f6; color: white; border: none;
                        padding: 12px 24px; border-radius: 8px; cursor: pointer;
                        font-size: 16px; font-weight: 500;
                    ">确定</button>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 5秒后自动关闭
        setTimeout(() => {
            const modal = document.getElementById('sync-success-modal');
            if (modal) modal.remove();
        }, 10000);
    }

    // 备份数据
    backupData() {
        const characters = JSON.parse(localStorage.getItem('cached_characters') || '[]');
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            characters: characters,
            history: this.importHistory
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aiko_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('success', '备份完成', '数据备份已下载');
    }

    // 清空数据
    clearData() {
        if (confirm('确定要清空所有角色数据吗？此操作不可恢复！')) {
            localStorage.removeItem('cached_characters');
            this.importHistory = [];
            this.saveImportHistory();
            this.renderImportHistory();
            this.updateStats();
            
            this.showNotification('success', '数据已清空', '所有角色数据已被删除');
        }
    }

    // 下载模板
    downloadTemplate() {
        const templates = {
            csv: `name,description,personality,prompt,tags,type,source,creator,imageUrl,isOfficial
"小樱","魔卡少女樱主角，拥有强大的魔法力量","开朗勇敢,善良纯真","你是木之本樱，一个10岁的小学生，拥有收集库洛牌的使命。你性格开朗、勇敢善良，总是用积极的态度面对困难。","魔法少女,动漫,治愈","动漫","魔卡少女樱","CLAMP","",true
"路飞","海贼王主角，橡胶果实能力者","乐观向上,永不放弃","你是蒙奇·D·路飞，草帽海贼团的船长。你的梦想是成为海贼王，拥有橡胶果实能力。你性格单纯乐观，重视伙伴。","海贼,冒险,热血","动漫","海贼王","尾田荣一郎","",true
"AI助手","智能助手角色","专业友好,乐于助人","你是一个专业的AI助手，具备广泛的知识和强大的分析能力。你总是耐心回答用户的问题，提供准确有用的信息。","助手,AI,智能","其他","系统默认","开发团队","",false`,
            
            feishu: `角色名,角色描述,性格特点,提示词,标签,角色类型,来源作品,创作者,头像URL,是否官方
"小樱","魔卡少女樱主角，拥有强大的魔法力量","开朗勇敢;善良纯真","你是木之本樱，一个10岁的小学生，拥有收集库洛牌的使命。你性格开朗、勇敢善良，总是用积极的态度面对困难。","魔法少女;动漫;治愈","动漫","魔卡少女樱","CLAMP","",是
"路飞","海贼王主角，橡胶果实能力者","乐观向上;永不放弃","你是蒙奇·D·路飞，草帽海贼团的船长。你的梦想是成为海贼王，拥有橡胶果实能力。你性格单纯乐观，重视伙伴。","海贼;冒险;热血","动漫","海贼王","尾田荣一郎","",是
"AI助手","智能助手角色","专业友好;乐于助人","你是一个专业的AI助手，具备广泛的知识和强大的分析能力。你总是耐心回答用户的问题，提供准确有用的信息。","助手;AI;智能","其他","系统默认","开发团队","",否`,
            
            json: `[
  {
    "name": "小樱",
    "description": "魔卡少女樱主角，拥有强大的魔法力量",
    "personality": "开朗勇敢,善良纯真",
    "prompt": "你是木之本樱，一个10岁的小学生，拥有收集库洛牌的使命。你性格开朗、勇敢善良，总是用积极的态度面对困难。",
    "tags": ["魔法少女", "动漫", "治愈"],
    "type": "动漫",
    "source": "魔卡少女樱",
    "creator": "CLAMP",
    "imageUrl": "",
    "isOfficial": true
  },
  {
    "name": "路飞",
    "description": "海贼王主角，橡胶果实能力者",
    "personality": "乐观向上,永不放弃",
    "prompt": "你是蒙奇·D·路飞，草帽海贼团的船长。你的梦想是成为海贼王，拥有橡胶果实能力。你性格单纯乐观，重视伙伴。",
    "tags": ["海贼", "冒险", "热血"],
    "type": "动漫",
    "source": "海贼王",
    "creator": "尾田荣一郎",
    "imageUrl": "",
    "isOfficial": true
  },
  {
    "name": "AI助手",
    "description": "智能助手角色",
    "personality": "专业友好,乐于助人",
    "prompt": "你是一个专业的AI助手，具备广泛的知识和强大的分析能力。你总是耐心回答用户的问题，提供准确有用的信息。",
    "tags": ["助手", "AI", "智能"],
    "type": "其他",
    "source": "系统默认",
    "creator": "开发团队",
    "imageUrl": "",
    "isOfficial": false
  }
]`
        };

        const template = templates[this.currentTab];
        const extension = this.currentTab === 'json' ? 'json' : 'csv';
        const filename = `character_template_${this.currentTab}.${extension}`;

        const blob = new Blob([template], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('success', '模板下载完成', `已下载包含示例数据的 ${this.currentTab} 格式模板`);
    }

    // 显示通知
    showNotification(type, title, message) {
        const notification = document.getElementById('notification');
        const icon = document.getElementById('notification-icon');
        const titleEl = document.getElementById('notification-title');
        const messageEl = document.getElementById('notification-message');

        // 设置图标和颜色
        const config = {
            success: { icon: 'check-circle', color: 'text-green-400' },
            error: { icon: 'x-circle', color: 'text-red-400' },
            info: { icon: 'info', color: 'text-blue-400' },
            warning: { icon: 'alert-triangle', color: 'text-yellow-400' }
        };

        const { icon: iconName, color } = config[type] || config.info;
        icon.setAttribute('data-lucide', iconName);
        // 修复SVG元素className问题
        icon.setAttribute('class', `h-5 w-5 ${color}`);

        titleEl.textContent = title;
        messageEl.textContent = message;

        notification.classList.remove('hidden');
        notification.classList.add('fade-in');

        // 重新初始化图标
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 自动隐藏
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    // 隐藏通知
    hideNotification() {
        document.getElementById('notification').classList.add('hidden');
    }

    // 加载导入历史
    loadImportHistory() {
        return JSON.parse(localStorage.getItem('import_history') || '[]');
    }

    // 保存导入历史
    saveImportHistory() {
        localStorage.setItem('import_history', JSON.stringify(this.importHistory));
    }

    // 格式化日期
    formatDate(date) {
        return new Date(date).toLocaleString('zh-CN');
    }

    // 智能解析CSV行（支持多行文本字段）
    parseCSVRows(csvText) {
        const rows = [];
        let currentRow = '';
        let inQuotes = false;
        let quoteChar = '';
        
        const lines = csvText.split('\n');
        
        console.log('📝 开始智能行分割，原始行数:', lines.length);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (!currentRow && !line.trim()) {
                continue; // 跳过空行
            }
            
            // 检测引号状态
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if (!inQuotes && (char === '"' || char === '"' || char === '"')) {
                    inQuotes = true;
                    quoteChar = char;
                } else if (inQuotes && char === quoteChar) {
                    // 检查是否是转义引号
                    if (j + 1 < line.length && line[j + 1] === quoteChar) {
                        j++; // 跳过转义引号
                    } else {
                        inQuotes = false;
                        quoteChar = '';
                    }
                }
            }
            
            // 添加当前行到当前记录
            if (currentRow) {
                currentRow += '\n' + line;
            } else {
                currentRow = line;
            }
            
            // 如果不在引号内，这一行完成
            if (!inQuotes) {
                if (currentRow.trim()) {
                    rows.push(currentRow.trim());
                }
                currentRow = '';
            }
        }
        
        // 处理最后一行（如果有未完成的记录）
        if (currentRow.trim()) {
            rows.push(currentRow.trim());
        }
        
        console.log('✅ 智能行分割完成:', {
            原始行数: lines.length,
            解析后行数: rows.length,
            前3行预览: rows.slice(0, 3).map(row => row.substring(0, 100) + '...')
        });
        
        return rows;
    }

    // 深度调试缺失角色
    deepDebugMissingCharacters(lines, characters, headers) {
        console.log('🔍 深度调试: 分析缺失角色原因');
        
        // 分析每一行的解析状态
        let processedCount = 0;
        let skippedLines = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) {
                skippedLines.push({行号: i, 原因: '空行', 内容: '(空行)'});
                continue;
            }
            
            const values = this.parseCSVLine(line);
            
            if (values.length < headers.length) {
                skippedLines.push({
                    行号: i,
                    原因: '字段不足',
                    期望字段: headers.length,
                    实际字段: values.length,
                    内容预览: line.substring(0, 100) + '...',
                    解析结果: values.slice(0, 3)
                });
                continue;
            }
            
            // 检查是否有角色名
            const character = {};
            headers.forEach((header, index) => {
                character[header.trim()] = values[index];
            });
            
            const normalizedCharacter = this.normalizeCharacterData(character);
            if (!normalizedCharacter.name || normalizedCharacter.name.trim() === '') {
                skippedLines.push({
                    行号: i,
                    原因: '缺少角色名',
                    内容预览: line.substring(0, 100) + '...',
                    第一个字段: values[0]
                });
                continue;
            }
            
            processedCount++;
        }
        
        console.log('📊 深度调试结果:', {
            总数据行: lines.length - 1,
            处理成功: processedCount,
            跳过行数: skippedLines.length,
            跳过详情: skippedLines.slice(0, 10) // 只显示前10个
        });
        
        if (skippedLines.length > 10) {
            console.log(`📝 还有${skippedLines.length - 10}行被跳过，详细信息已省略`);
        }
        
        // 分析跳过原因分布
        const reasonStats = {};
        skippedLines.forEach(item => {
            reasonStats[item.原因] = (reasonStats[item.原因] || 0) + 1;
        });
        
        console.log('📈 跳过原因统计:', reasonStats);
    }

    // 获取跳过原因统计
    getSkipReasons() {
        return this.skipReasons || {};
    }

    // 详细统计信息
    logDetailedStats(lines, characters) {
        console.log('📈 详细统计信息:');
        console.log('📊 数据行分析:', {
            总行数: lines.length,
            表头行: 1,
            数据行: lines.length - 1,
            空行数: this.skipReasons.emptyLine || 0
        });
        
        console.log('📋 解析结果统计:', {
            成功解析: characters.length,
            跳过总数: Object.values(this.skipReasons).reduce((a, b) => a + b, 0),
            跳过详情: {
                空行: this.skipReasons.emptyLine || 0,
                字段不匹配: this.skipReasons.fieldCountMismatch || 0,
                缺少角色名: this.skipReasons.missingName || 0,
                处理错误: this.skipReasons.processingError || 0
            }
        });

        // 角色类型分布
        const typeDistribution = {};
        characters.forEach(char => {
            typeDistribution[char.type] = (typeDistribution[char.type] || 0) + 1;
        });
        
        console.log('🎭 角色类型分布:', typeDistribution);

        // 数据质量检查
        const qualityCheck = {
            有描述: characters.filter(c => c.description && c.description.trim()).length,
            有提示词: characters.filter(c => c.prompt && c.prompt.trim()).length,
            有标签: characters.filter(c => c.tags && c.tags.length > 0).length,
            官方角色: characters.filter(c => c.isOfficial).length
        };
        
        console.log('✅ 数据质量检查:', qualityCheck);

        // 可能的问题提醒
        const issues = [];
        if (this.skipReasons.missingName > 0) {
            issues.push(`${this.skipReasons.missingName}个角色缺少名称`);
        }
        if (this.skipReasons.fieldCountMismatch > 0) {
            issues.push(`${this.skipReasons.fieldCountMismatch}行字段数量不匹配`);
        }
        if (qualityCheck.有描述 < characters.length * 0.8) {
            issues.push(`${characters.length - qualityCheck.有描述}个角色缺少描述`);
        }
        
        if (issues.length > 0) {
            console.warn('⚠️ 发现的问题:', issues);
        } else {
            console.log('🎉 数据质量良好，未发现明显问题');
        }
    }

    // 一键审核通过所有待审核角色
    approveAllPending() {
        if (!confirm('确定要一键通过所有待审核角色吗？')) {
            return;
        }

        try {
            const existingData = localStorage.getItem('cached_characters');
            const characters = existingData ? JSON.parse(existingData) : [];
            
            let approvedCount = 0;
            const updatedCharacters = characters.map(character => {
                if (character.reviewStatus === 'pending') {
                    approvedCount++;
                    return {
                        ...character,
                        reviewStatus: 'approved'
                    };
                }
                return character;
            });
            
            localStorage.setItem('cached_characters', JSON.stringify(updatedCharacters));
            
            // 通知主应用数据变更
            if (typeof window !== 'undefined' && window.localStorage) {
                window.dispatchEvent(new CustomEvent('storage', {
                    detail: {
                        key: 'data_sync',
                        newValue: Date.now().toString()
                    }
                }));
            }
            
            this.showNotification(`✅ 审核通过 ${approvedCount} 个角色！现在用户可以在app中看到这些角色了`, 'success');
            this.updateStats();
            
            return { success: true, approvedCount };
        } catch (error) {
            console.error('❌ 批量审核失败:', error);
            this.showNotification(`❌ 审核失败: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }

    // 延迟函数
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 添加测试按钮（开发模式）
    addTestButton() {
        const testBtn = document.createElement('button');
        testBtn.innerHTML = '🧪 测试CSV解析';
        testBtn.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
        testBtn.onclick = () => this.testCSVParsing();
        document.body.appendChild(testBtn);
    }

    // 测试CSV解析
    testCSVParsing() {
        console.log('🧪 开始CSV解析测试...');
        
        // 测试用例
        const testCases = [
            {
                name: '基础CSV',
                data: 'name,description\n"测试角色","这是测试"'
            },
            {
                name: '包含逗号的CSV',
                data: 'name,description\n"测试角色","包含,逗号的描述"'
            },
            {
                name: '中文逗号分隔',
                data: 'name，description\n"测试角色"，"中文逗号分隔"'
            },
            {
                name: '分号分隔',
                data: 'name;description\n"测试角色";"分号分隔"'
            },
            {
                name: '不匹配引号',
                data: 'name,description\n"测试角色","缺少引号'
            },
            {
                name: '完整角色数据',
                data: `name,description,personality,prompt,tags,type,source,creator,imageUrl,isOfficial
"测试角色","测试角色描述","友好,乐观","你是一个测试角色","测试,角色","其他","测试","系统","",false`
            }
        ];

        testCases.forEach((testCase, index) => {
            console.log(`\n📋 测试 ${index + 1}: ${testCase.name}`);
            try {
                const result = this.parseCSV(testCase.data);
                console.log('✅ 解析成功:', result);
            } catch (error) {
                console.error('❌ 解析失败:', error.message);
            }
        });

        console.log('\n🧪 CSV解析测试完成！');
        this.showNotification('info', '测试完成', '请查看控制台输出');
    }
}

// 初始化系统
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 AIko Spark 后台管理系统启动');
    window.adminSystem = new AdminSystem();
    console.log('✅ 审核函数已绑定:', typeof window.adminSystem.approveAllPending);
});
