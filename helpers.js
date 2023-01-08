module.exports = {

    // is_invalid_params: function(...required_params) {
    //     return required_params.some(x => x == null || x === '');
    // },

    // For request.query.get
    is_invalid_params: function(query, ...required_params) {
        return required_params.some(x => query.has(x) !== true);
    }

};
