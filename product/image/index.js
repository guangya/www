const vm = new Vue({
	el: '#app',
	data: {
        env: "production",
        sourceImageClones: [],
        sourceCount: 0,
        tplCount: 0,
        tplMaps: {},
        checked: false,
        tpl: [],
        // ------------------------------------------------------
		db: null,
		shapeCollectionName: "1688_composition_shapes",
        paths: {psRootPath: 'D:\\ps'},
        sourcePath: "",
        // tplPath: "assets/product/image/templates",
        tplPath: "https://damiu.gitee.io/www/assets/product/image/templates",
        outputPath: "",
        dialogVisible: false,
        dialogImageUrl: '',
        disabled: false,
        fileList: [],
        tpls: [],
        sources: [], 
        // 各司其职：开始 -------------------------------------------------
        sourceImages: [], // 源文件
        sourceImageUrls: [], // 源文件大图浏览列表
        tplSuits: [], // 模版数据组合，页面渲染后会被附加两个字段:backgroundDom(背景dom)和watermarkDom(水印dom)
        selectedTplSuits: [],
        canvas: null, // 通用画布
        ctx: null, // 通用画笔
        previewImages: [], // 预览图片
        previewImageUrls: [], // 预览图片大图列表
        previewImageCount: 0,
        previewBlobs: [],
        previewLoading: false, // 图片预览区域加载等待动画
        sourceLoading: false, // 源文件区域加载等待动画
        // 各司其职：结束 -------------------------------------------------
        options: {
            themeCode: '201',
            composeModel: 0,
            imageSize: '8x'
        },

        tplCategories: [], // TPL_GROUP_CATEGORIES
        selectedTplCategory: null,
        previews: [],
        suits : [],
        categoryName: "",
        categories: {}
	},
	mounted: async function() {
        let vm = this;
        const env = window.localStorage.getItem("environment");
        vm.env = env === null ? "production" : env;
        vm.options = vm.getOptions(vm.env);
	},
    watch: {
        categoryName: async function(categoryName) {
            if (categoryName in this.categories) {
                this.tplSuits = this.suits = this.categories[categoryName];
            } else {
                const response = await axios.get(`${vm.options.dataBaseURL}${categoryName}.json`);
                if ('data' in response.data) {
                    const secret = window.localStorage.getItem("username") + window.localStorage.getItem("password");
                    const decrypted = CryptoJS.AES.decrypt(response.data.data, secret);
                    this.tplSuits = this.suits = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
                } else {
                    this.tplSuits = this.suits = response.data;
                }
                // this.tplSuits = this.suits = response.data;
            }
            // 强刷，以避免检测不到数组更新
            this.$forceUpdate();
        }
    },
	methods: {
        handleBackgroundImageLoad: function(event, tpl) {
            tpl['imageDom'] = event.target;
            tpl['backgroundDom'] = event.target;
            return true;
        },
        handleForegroundImageLoad: function(event, tpl) {
            tpl['foregroundDom'] = event.target;
            return true;
        },
        handleTplMarkLoad: function(event, tpl) {
            tpl['markDom'] = event.target;
            tpl['watermarkDom'] = event.target;
            return true;
        },
        handleSuitTablCurrentChange: function(currentRow, oldCurrentRow) {
            this.tpls = currentRow.list;
            this.tplCount = this.tpls.length;
        },
        handleSelectionChange: function(selection) {
            // this.tpls = selection[0].list;
            this.selectedTplSuits = selection;
            this.tplCount = this.tpls.length;
            return this.updatePreviewImages();
        },

        /**
         * 处理用户点击表格头部 checkbox 的事件
         * 
         * @param {Array} selection 
         * @param {Object} row 
         */
        handleTableSelect: function (selection, row) {
            // 当用户点击表格前的 checkbox 时，若 selection.length == 0，认为是取消操作
            this.tplGroup = selection.length > 0 ? row : [];
            // 生成产品图片
            this.generateProductImages();
        },

        handleSourceChange: function() {
            this.sourceLoading = true;
            const files = this.$refs.sourceFileSelector.files;
            this.sourceCount = files.length;
            
            // files的类型为Filelist(object)，所以不能用数组的函数forEach
            for(const file of files) {
                file.code = file.name.slice(0, -4);
                file.url = window.URL.createObjectURL(file);
                this.sourceImages.push(file);
                this.sources.push(file);
                this.sourceImageUrls.push(file.url);
            }
            return true;
        },
        handleSuitCodeChange: function(value) {
            return this.updatePreviewImages(false);
        },
        handleThemeCodeChange: function(value) {
            return this.updatePreviewImages(false);
        },
        handleComposeModelChange: function(value) {
            return this.updatePreviewImages(false);
        },
        handleSourceClean: function() {
            this.sourceImages = [];
            this.sources = [];
            this.previews = [];
            this.sourceImageUrls = [];
        },
        handleSourceLoad: function(event, source, index){
            const now = new Date();
            source['imageDom'] = event.target;
            this.$forceUpdate(); // 修改数组内部元素的属性，需要强制刷新一次
            
            if (--this.sourceCount <= 0) {
                this.sourceLoading = false;
                this.updatePreviewImages();
            }
        },
        handleCreateImage: function(tpl, source) {
            if ( !source.imageDom || !tpl.imageDom || !tpl.markDom ) return '';
            if (null === this.canvas) this.canvas = document.getElementById('canvas');
            if (null === this.ctx) this.ctx = this.canvas.getContext('2d');

            const canvas = this.canvas, ctx = this.ctx;

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tpl.imageDom, 0, 0);
            ctx.drawImage(source.imageDom, tpl.x, tpl.y, tpl.sourceWidth, tpl.sourceHeight);
            ctx.drawImage(tpl.markDom, tpl.x, tpl.y, tpl.sourceWidth, tpl.sourceHeight);

            return canvas.toDataURL();
        },
        handlePreviewImageLoad: function(event) {
            if (++this.previewImageCount >= this.previewImages.length) this.previewLoading = false;
        },

        imageExportHandle: function() {
            const images = imagesToExport();
            const imageSize = this.options.imageSize;
            const exporter = imageSize == '10x' ? exportToDefaultSize : exportToNewSize;
            images.forEach( (image, index) => {
                const filename = image.dataset.title + ".jpg";
                // 为避免出现因高频下载导致的文件写入失败，这里的时间间隔一定不要省
                setTimeout(function() { exporter(image, filename, imageSize)}, 1500 * index);
            });

            return true;
        },

        generateProductImages: async function () {
            // this.updatePreviewImages();
        },
        
        updatePreviewImages: async function(loading = true) {
            const vm = this;
            // 页面加载完成时，会自动触发模版列表的selection，这时源文件为空，不需要生成预览图片
            if(vm.sources.length <= 0) return true;
            
            const images = createImages(vm.selectedTplSuits, vm.sources, {themeCode: vm.themeCode, composeType: vm.options.composeModel, baseURL: vm.tplPath});
            vm.previews = images;
        },
        handleTplRefresh: function() {},
        functest: function(value) {
            return value + 1;
        },

        isRowSelectable: function(row, index) {
            // 为避免下载后出现的文件散乱，目前系统强制每次只能生成一套产品图片
            // 当已经有勾选的模版时，其余的模版状态变成不可选中
            return this.selectedTplSuits.length > 0 && !this.selectedTplSuits.includes(row) ? false : true;
        },
        getOptions: function(env) {
            const available = {
                production: {
                    themeCode: '201',
                    composeModel: 0,
                    imageSize: '8x',
                    "templateBaseURL": "product/assets/image/templates/",
                    "dataBaseURL": "data/product/image/"
                },
                development: {
                    themeCode: '201',
                    composeModel: 0,
                    imageSize: '8x',
                    "templateBaseURL": "product/assets/image/templates/",
                    "dataBaseURL": "data/product/image/"
                }
            };
            
            return env in available ? available[env] : available['production'];
        }
	}
});

/**
 * 利用 canvas 合并图像
 * 
 * @param {Array} imagesToDraw [{id, left, top, width, height, rotate}]
 * @returns 
 */
function composeImagesByCanvas(imagesToDraw) {
    if ( !window.ctx ) {
        window.canvas = document.getElementById('canvas');
        window.ctx = this.canvas.getContext('2d');
    }

    const canvas = window.canvas, ctx = window.ctx;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for(let image of imagesToDraw) {
        const dom = document.getElementById(image.id);
        
        if (image.rotate == 0) {
            ctx.drawImage(dom, image.left, image.top, image.width, image.height);
        } else {
            ctx.translate(image.left, image.top); // 549, 674
            ctx.rotate(image.rotate * Math.PI / 180);

            ctx.drawImage(dom, 0, 0, image.width, image.height);

            // 恢复设置（恢复的步骤要跟你修改的步骤向反）
            ctx.rotate(-1 * image.rotate * Math.PI / 180);
            ctx.translate(-1 * image.left, -1 * image.top);
        }
    }

    return canvas.toDataURL("image/jpeg", 1.0);
}


function createImages(suits, sources, customOptions) {
    const options = Object.assign({}, {themeCode: '201', composeType: 0, baseURL: 'generator/image/tpl'}, customOptions);
    const images = [];
    
    for(let suit of suits) {
        for(let template of suit.templates) {
            let sourcesToCompose = JSON.parse(JSON.stringify(sources));
            switch(template.role) {
                case "MODEL":
                case "SIZE":
                case "COVER":
                    // console.log('customOptions.composeType:', customOptions.composeType);
                    if (customOptions.composeType == 0) sourcesToCompose = sourcesToCompose.slice(0, template.sources.length);
                case "SKU":
                    const fillCount = template.sources.length;
                    const sourcesLength = sourcesToCompose.length;
                    for(let index = 0; index < sourcesLength;) {
                        const drawImages = [];
                        if ("background" in template) {
                            drawImages.push(
                                {width: 1000, height: 1000, left: 0, top: 0, rotate: 0, id: "background-" + suit.code + "-" + template.name}
                            );
                        }

                        let sourceCode = "";
                        for(let source of template.sources) {
                            sourceCode = sourcesToCompose[index++].code;
                            source.id = "source-" + sourceCode;
                            drawImages.push(source);
                            if ("watermark" in template) {
                                const watermark = JSON.parse( JSON.stringify(source) );
                                watermark.id = "watermark-" + suit.code + "-" + template.name;
                                drawImages.push(watermark);
                            }
                        }

                        if ("foreground" in template) {
                            drawImages.push(
                                {width: 1000, height: 1000, left: 0, top: 0, rotate: 0, id: "foreground-" + suit.code + "-" + template.name}
                            );
                        }

                        // 如果要使用自动索引模式：index/fillCount
                        const image = { title: createImageTitle(suit.code, template.name, sourceCode.slice(0,2)), src: composeImagesByCanvas(drawImages)};
                        images.push(image);
                    }
                    break;
                case "OTHER":
                    const image = { title: createImageTitle(suit.code, template.name, 1), src: options.baseURL + template.background};
                    images.push(image);
                    break;
            }
        }
    }

    return images;
}


/**
 * 创建图片文件名
 * 
 * 文件名示例：22300101-模特图
 * 文件名格式：主题编号（223） + 模版套件编号（001） + 产品在当前 SKU 组中的序号（01）
 * 
 * @param {*} suitCode 
 * @param {*} templateName 
 * @param {*} index 
 * @returns 
 */
 function createImageTitle(suitCode, templateName, index = 0) {
    index = String(index).padStart(2, '0');

    let title = suitCode + index;
    if (templateName.length > 0) title += "-" + templateName;

    return title;
};

/**
 * 创建 image 文件名对应的缓存文件名
 * 
 * 这个字段主要用于生成图片的 URL 中，移除 themeCode 可以避免在 themeCode 发生改变时，前端重复请求图片数据的问题
 * 
 * @param {*} imageFilename 
 * @returns 
 */
function createImageCacheFilename(imageFilename) {
    return imageFilename.slice(2);
}

/**
 * 创建图片的预览 URL
 * 
 * 示例："generator/image/preview/001/01-a.png,01-b,png?filename=00101-模特图"
 * 
 * @param {String} templateCode 模版编号，注意不是 suitCode
 * @param {Array} sources 生成当前图片需要包含的所有源图
 * @param {String} filename 
 * @returns 
 */
function createImagePreviewURL(templateCode, sources, filename) {
    // const cacheFilename = createImageCacheFilename(filename);
    // ?cachename=" + cacheImageFilename
    if (!sources) sources = ["01.png"];
    console.log('templateCode: ', templateCode);
    return `generator/image/preview/${templateCode}/` + sources.join(",");
}


/**
 * 按照图片默认尺寸导出，当前为1000px*1000px
 * 
 * @param {DOM} image 
 * @param {String} filename 
 * @param {String} size 
 */
function exportToDefaultSize(image, filename, size) {
    saveAs(image.src, filename);
}

/**
 * 按照特定尺寸导出图片
 * 
 * 当前依赖预置的 canvas dom 元素，可用的 size 取决于是否已经创建了对应的 canvas
 * 
 * @param {DOM} image 
 * @param {String} filename 
 * @param {String} size 
 */
function exportToNewSize(image, filename, size) {
    const canvasId = 'canvas-' + size;
    if ( !window.canvases ) window.canvases = {};
    const canvases = window.canvases;
    if ( !canvases.hasOwnProperty(canvasId) ) {
        canvases[canvasId] = { canvas: document.getElementById(canvasId)};
        canvases[canvasId].ctx = canvases[canvasId].canvas.getContext("2d");
    }
    
    const canvas = canvases[canvasId].canvas;
    const ctx = canvases[canvasId].ctx;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    saveAs(canvas.toDataURL("image/jpeg", 1.0), filename);
}

/**
 * 获取需要导出的图片列表
 * 
 * @returns 包含图片信息的数组
 */
function imagesToExport() {
    return document.querySelectorAll(".preview-image img");
}