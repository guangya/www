const vm = new Vue({
	el: '#app',
	data: { data: [], options: {}},
	mounted: async function() {
		const vm = this;

        const env = window.localStorage.getItem("environment");
        vm.env = env === null ? "production" : env;
        vm.options = vm.getOptions(vm.env);


        const response = await axios.get(vm.options.dataBaseURL + 'carton-size.json');
		const responseData = response.data;

		if ('data' in responseData) {
			const secret = window.localStorage.getItem("username") + window.localStorage.getItem("password");
			const decrypted = CryptoJS.AES.decrypt(responseData.data, secret);
			this.data = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
		} else {
			this.data = responseData;
		}
	},
	methods: {
		copy: function(row) {
			const vm = this;
			let text = `数量：${row.quantity}个，箱规：${row.length}x${row.width}x${row.height}cm，毛重：${row.weight}kg。数据仅供参考，具体以实际发出为准。`;
			navigator.clipboard.writeText(text).then(function() {
				vm.$message({type: "success", message: "复制成功"});
			}, function() {
				vm.$message({type: "error", message: "复制出错"});
			});
		},
        getOptions: function(env) {
            const available = {
                production: {
                    "dataBaseURL": "data/product/"
                },
                development: {
                    "dataBaseURL": "data/src/product/"
                }
            };
            
            return env in available ? available[env] : available['production'];
        }
	}
});