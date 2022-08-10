const vm = new Vue({
	el: '#app',
	data: { suitCode: '', suits: {}},
	mounted: async function() {
        const vm = this;
        const response = await axios.get('product/suit/suits.json');
		vm.suits = response.data;
    },
	methods: {
        queryHandler: async function() {
            if ( ! (this.suitCode in this.suits) ) return this.$message("没有查询到结果");
            window.frames[0].vm.suit = this.suits[this.suitCode];
        },
        printHandler: function() {
            window.frames[0].print();
        }
    }
});