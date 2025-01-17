// mongoose-partial-full-search

const _ = require('underscore');

module.exports = exports = function addPartialFullSearch(schema, options) {
    schema.statics = {
        ...schema.statics,
        makePartialSearchQueries: function(q) {
            if (!q) return {};
            const $or = Object.entries(this.schema.paths).reduce((queries, [path, val]) => {
                val.instance == "String" &&
                    queries.push({
                        [path]: new RegExp(q, "gi")
                    });
                return queries;
            }, []);
            return { $or }
        },
        searchPartial: function(q, { find = {}, searchPaths = "", select = '', sort, ...pagination }) {
            return this.find({
                ...(!searchPaths.length ?
                    this.makePartialSearchQueries(q) : {
                        $or: searchPaths.split(' ').map(path => ({
                            [path]: new RegExp(q, "gi")
                        }))
                    }
                ),
                ...find
            }, select, pagination).sort(sort).lean();
        },
        searchFull: function(q, { find = {}, select = '', sort, ...pagination }) {
            return this.find({
                $text: {
                    $search: q
                },
                ...find
            }, select, pagination).sort(sort).lean();
        },

        search: function(q, opts) {
            return this.searchFull(q, opts).then(exactSearchData => {
                return this.searchPartial(q, opts).then(partialSearchData => {
                    let result = [...exactSearchData, ...partialSearchData];
                    result = result.map(r => ({...r, _id: r._id.toString() }))
                    result = _.uniq(result, '_id');
                    return result;
                })
            });
        }
    }
}

exports.version = require('../package').version;