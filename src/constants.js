module.exports = {
  // For responders
  GLOBAL_FUNCTION_LABELS: {
    ASYNC_CALLBACK: "ASYNC_CALLBACK_asyncNative",
    ANONYMOUS_CALLBACK: "ANONYMOUS_CALLBACK_asyncNative",
    THREAD: "THREAD_asyncNative"
  },
  
  NEW_LINE_PLACEHOLDER: '<{NEW_LINE}>',
  NEWLINE_REGEXP: /<\{NEW_LINE\}>/g,
  LINE_COMMENTS_WITH_COLON: /\/\/.*?;.*?\n/g,
  ALL_MULTILINE_COMMENTS: /\/\*(\n|.)*?\*\//g,

  ASYNC_PLACEHOLDER_REGEXP: /\{(\$[\w\$]*?)\}/,   // i.e. "{$text}"
  ASYNC_YIELD: '\nyield 1',
  ASYNC_REPLACE_RENDERER: function ASYNC_REPLACE_RENDERER(fnName, id) {
    var fnLabel = module.exports.GLOBAL_FUNCTION_LABELS.ASYNC_CALLBACK;
    return 'function callback_' + fnName + '_' + id + '(e, r) { ' +
           'if ("$" !== "$1") $1 = r; ' +
           fnLabel + '(e, __it, ' + id + ', "$1");' +
           '}';
  },

  FUNCTION_FIND_REGEXP: /function.*?\{/g,
  FUNCTION_REGEXP: /(function.*?\{)/,
  FUNCTION_GENERATOR: function(fnName) {
    return '\nfunction* yielder_' + fnName + '() { ';
  },
  FUNCTION_AUTO_CALLBACKER:
    '\nif (typeof arguments[0] === "function" &&' +
    ' arguments[0].isAnonymousAsyncNative) {' +
    '\n   arguments[0](null, null);' +
    '\n}\n',

  FUNCTION_ITERATOR: function(fnName) {
    return '\n__it = yielder_' + fnName + '.apply(this, arguments);' +
    '\n__it.fnName = "' + fnName + '";' +
    '\n__it.complete = [];' +
    '\n__it.next();' +
    '\n}\n';
  },

  THREAD_REGEXP: /\$\:(.+?)[ \t]+=>[ \t]+\{/,
  THREAD_RENDERER: function THREAD_RENDERER(fnName, varName, code) {
    var fnLabel = module.exports.GLOBAL_FUNCTION_LABELS.THREAD;
    return fnLabel + '(' +
        '"' + fnName + '", "' + varName + '", ' +
        'function $' + varName + '(' + varName + ') {\n' +
          'try ' + code +
          '\ncatch(e) {\n' +
            'var eIsErr = e instanceof Error;\n' +
            'return {\n' +
            ' __asyncError: (eIsErr ? e.message : e),\n' +
            ' stack: (eIsErr ? e.stack : "<none>")\n' +
            '};\n' +
          '}\n' +
        '}, ' +
        varName + ', ' +
        '{$__THREAD});\n' +
        '$' + varName + '=$__THREAD';
  }
};
