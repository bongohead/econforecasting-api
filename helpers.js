module.exports = {

    is_invalid_params: function(...required_params) {
        return required_params.some(x => x == null || x === '');
    }

};
