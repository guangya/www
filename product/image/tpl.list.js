const vm = new Vue({
	el: '#app',
	data: {
        env: "production",
        data: [],
        basePath: 'generator/assets/templates',
        dataURI: 'data/src/image-generator',
        secret: '',
        options: {},
        files: [
            '弹力绳手链.json', '合金手镯.json', '夹片手链.json', '绒绳手链.json', '袖扣.json',
            'brooches.json', 'cow-bracelets.json', 'earrings.json', 'keyrings.json',
            'necklaces.json', 'pingjie-bracelets.json', 'rings.json', 'simple-bracelets.json'
        ]
    },
	mounted: async function() {
        const vm = this;

        const env = window.localStorage.getItem("environment");
        vm.env = env === null ? "production" : env;
        vm.options = vm.getOptions(vm.env);


        vm.secret = window.localStorage.getItem("username") + window.localStorage.getItem("password");

        for(let file of vm.files) {
            axios.get(vm.options.dataBaseURL + file).then(async function(response) {
                vm.pushNewTemplates(response.data);
            });
        }
	},
	methods: {
        pushNewTemplates: async function(original) {
            const vm = this;
            let data = [];

            if ('data' in original) {
                const decrypted = CryptoJS.AES.decrypt(original.data, vm.secret);
                data = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
            } else {
                data = original;
            }
    
            for(let index = 0; index < data.length; index++) {
                const item = data[index];
                item.templates.forEach(template => {
                    if('background' in template) template.foreground = template.background;
                    template.foreground = vm.basePath + template.foreground;
                });
            }

            vm.data = vm.data.concat(data);
            vm.$forceUpdate();
        },
        getOptions: function(env) {
            const available = {
                production: {
                    "templateBaseURL": "generator/assets/templates/",
                    "dataBaseURL": "data/image-generator/"
                },
                development: {
                    "templateBaseURL": "generator/assets/templates/",
                    "dataBaseURL": "data/src/image-generator/"
                }
            };
            
            return env in available ? available[env] : available['production'];
        }
    }
});