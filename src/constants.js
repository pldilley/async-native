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
    LINE_COMMENTS_WITH_BAD_CHARS: /\/\/.*?(\;|\{\$|\$\:).*?\n/g,
    LINE_COMMENTS_REPLACE_CHARS: function(match) {
      return match.replace(/\;/g, '⁏').replace(/\{\$/g, '{ $').replace(/\$\:/g, '$ː');
    },
    ALL_MULTILINE_COMMENTS: /\/\*(\n|.)*?\*\//g,
    ALL_MULTILINE_REPLACE: '/* (Multi-line comment stripped out by Async-Native) */',
    RETURN: /return/g,
    YIELD: /yield/g,
    RETURN_PLACEHOLDER: '<{"ret-urn"}>',
    YIELD_PLACEHOLDER: '<{"yi-eld"}>',
    WORD_PLACEHOLDER: /<\{"([a-z\-]+?)"\}>/g,

    // Deals with replacing and callbacks for placeholders
    ASYNC_PLACEHOLDER_FRAGMENT_REGEXP: /\([^()]*?\{(\$[\w\$]*?)\}[^()]*?\)/,   // i.e. "(...{$text}...)"
    ASYNC_THREAD_FRAGMENT_REGEXP: /\{(\$__THREAD_.+?)\}/,   // i.e. "$__THREAD"
    ASYNC_THREAD_PLACEHOLDER: '$__THREAD',
    ASYNC_PLACEHOLDER_REGEXP: /\{(\$[\w\$]*?)\}/,   // i.e. "{$text}"
    ASYNC_GOOD_PLACEHOLDER_CHAR_COMBOS: /(!==|===|==|!=)/g,
    ASYNC_BAD_PLACEHOLDER_CHARS: /[=;]/,
    ASYNC_YIELD: '\n/**/    yield 1',
    ASYNC_REPLACE_RENDERER: function ASYNC_REPLACE_RENDERER(fnName, varName, id) {
        var fnLabel = module.exports.GLOBAL_FUNCTION_LABELS.ASYNC_CALLBACK;
        return '\n/**/    function placeholder_' + fnName + '_' + id + '(e, r) {\n' +
            '/**/        if ("$" !== "' + varName + '") ' + varName + ' = r;\n' +
            '/**/        ' + fnLabel + '(e, __it, arguments.callee, "' + varName + '");\n' +
            '/**/    }';
    },

    // Deals with finding functions and transforming them into generators
    FUNCTION_FIND_REGEXP: /function.*?\{/g,
    FUNCTION_REGEXP: /(function.*?\{)/,
    FUNCTION_PLACEHOLDER: 'function',
    FUNCTION_GENERATOR: function (fnName) {
        return '\nfunction* yielder_' + fnName + '() { ';
    },
    FUNCTION_ITERATOR: function(fnName) {
      return '\n__it = yielder_' + fnName + '.apply(this, arguments);' +
      '\n__it.fnName = "' + fnName + '";' +
      '\n__it.complete = [];' +
      '\n__it.anonymous = {};' +
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
            '   catch(e) {\n' +
            '       var eIsErr = e instanceof Error;\n' +
            '       return {\n' +
            '           __asyncError: (eIsErr ? e.message : (e + "")),\n' +
            '           stack: (eIsErr ? e.stack : "<none>")\n' +
            '       };\n' +
            '   }\n' +
            '}, ' +
            '{' + module.exports.ASYNC_THREAD_PLACEHOLDER + '_' + varName + '});\n' +
            '$' + varName + '=' + module.exports.ASYNC_THREAD_PLACEHOLDER + '_' + varName;
    }
};
