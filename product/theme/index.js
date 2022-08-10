const vm = new Vue({
	el: '#app',
	data: { themes: [], options: {}},
	mounted: async function() {
		const vm = this;

		const env = window.localStorage.getItem("environment");
        vm.env = env === null ? "production" : env;
        vm.options = vm.getOptions(vm.env);

        const response = await axios.get(vm.options.dataBaseURL + 'themes.json');
		const responseData = response.data;

		if ('data' in responseData) {
			const secret = window.localStorage.getItem("username") + window.localStorage.getItem("password");
			const decrypted = CryptoJS.AES.decrypt(responseData.data, secret);
			this.themes = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
		} else {
			this.themes = responseData;
		}
	},
	methods: {
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