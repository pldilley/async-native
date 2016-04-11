module.exports = {
    // For responders.js (global functions for the mechanics of this library)
    GLOBAL_FUNCTION_LABELS: {
        ASYNC_CALLBACK: "ASYNC_CALLBACK_asyncNative",
        ANONYMOUS_MARKER: "ANONYMOUS_MARKER_asyncNative",
        ANONYMOUS_CALLBACK: "ANONYMOUS_CALLBACK_asyncNative",
        THREAD: "THREAD_asyncNative"
    },

    // Deals with stripping out new lines, line comments with colons and multi-line comments (re-insert new lines post)
    NEW_LINE_PLACEHOLDER: '<{NEW_LINE}>',
    NEWLINE_REGEXP: /<\{NEW_LINE\}>/g,
    LINE_COMMENTS_WITH_COLON: /\/\/.*?;.*?\n/g,
    ALL_MULTILINE_COMMENTS: /\/\*(\n|.)*?\*\//g,

    // Deals with replacing and callbacks for placeholders
    ASYNC_PLACEHOLDER_REGEXP: /\{(\$[\w\$]*?)\}/,   // i.e. "{$text}"
    ASYNC_YIELD: '\nyield 1',
    ASYNC_REPLACE_RENDERER: function ASYNC_REPLACE_RENDERER(fnName, id) {
        var fnLabel = module.exports.GLOBAL_FUNCTION_LABELS.ASYNC_CALLBACK;
        return 'function callback_' + fnName + '_' + id + '(e, r) { ' +
            'if ("$" !== "$1") $1 = r; ' +
            fnLabel + '(e, __it, ' + id + ', "$1");' +
            '}';
    },

    // Deals with finding functions and transforming them into generators
    FUNCTION_FIND_REGEXP: /function.*?\{/g,
    FUNCTION_REGEXP: /(function.*?\{)/,
    FUNCTION_GENERATOR: function (fnName) {
        return '\nfunction* yielder_' + fnName + '() { ';
    },
    FUNCTION_ITERATOR: function (fnName) {
        return '\n__it = yielder_' + fnName + '.apply(this, arguments);' +
            '\n__it.fnName = "' + fnName + '";' +
            '\n__it.complete = [];' +
            '\n__it.next();' +
            '\n}\n';
    },

    // Deals with finding threads and transforming them into real threads
    THREAD_REGEXP: /\$\:(.+?)[ \t]+=>[ \t]+\{/,
    THREAD_RENDERER: function THREAD_RENDERER(fnName, varName, code) {
        var fnLabel = module.exports.GLOBAL_FUNCTION_LABELS.THREAD;
        return fnLabel +
            '(' + '"' + fnName + '", "' + varName + '", ' + varName + ', ' +
            'function $' + varName + '(' + varName + ') {\n' +
            '   try ' + code +
            '   \ncatch(e) {\n' +
            '       var eIsErr = e instanceof Error;\n' +
            '       return {\n' +
            '           __asyncError: (eIsErr ? e.message : (e + "")),\n' +
            '           stack: (eIsErr ? e.stack : "<none>")\n' +
            '       };\n' +
            '   }\n' +
            '},\n' +
            '{$__THREAD});\n' +
            '$' + varName + '=$__THREAD';
    }
};
