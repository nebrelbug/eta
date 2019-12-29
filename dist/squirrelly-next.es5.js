// v 1.0.32
function setPrototypeOf(obj, proto) {
    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(obj, proto);
    }
    else {
        obj.__proto__ = proto;
    }
}
function SqrlErr(message) {
    var err = new Error(message);
    setPrototypeOf(err, SqrlErr.prototype);
    return err;
}
SqrlErr.prototype = Object.create(Error.prototype, {
    name: { value: 'Squirrelly Error', enumerable: false }
});
// TODO: Class transpilation adds a lot to the bundle size
function ParseErr(message, str, indx) {
    var whitespace = str
        .slice(0, indx) // +2 because of {{
        .split(/\n/);
    // console.log('whitespace: \n' + JSON.stringify(whitespace))
    var lineNo = whitespace.length;
    var colNo = whitespace[lineNo - 1].length + 1;
    message +=
        ' at line ' +
            lineNo +
            ' col ' +
            colNo +
            ':\n\n' +
            '  ' +
            str.split(/\n/)[lineNo - 1] +
            '\n' +
            '  ' +
            Array(colNo).join(' ') +
            '^';
    throw SqrlErr(message);
}

/**
 * Trims either one whitespace character from the beginning of a string, or all
 *
 * @remarks
 * Includes trimLeft polyfill
 *
 * @param str - String to trim
 * @param type - Either '-' (trim only 1 whitespace char) or '_' (trim all whitespace)
 * @returns Trimmed string
 *
 */
function trimLeft(str, type) {
    if (type === '_') {
        // full slurp
        if (String.prototype.trimLeft) {
            return str.trimLeft();
        }
        else {
            return str.replace(/^[\s\uFEFF\xA0]+/, '');
        }
    }
    else {
        // type must be '-'
        return str.replace(/^(?:[\s\uFEFF\xA0]|\r\n)/, '');
    }
}
/**
 * Trims either one whitespace character from the end of the string, or all
 *
 * @remarks
 * Includes trimRight polyfill
 *
 * @param str - String to trim
 * @param type - Either '-' (trim only 1 whitespace char) or '_' (trim all whitespace)
 * @returns Trimmed string
 *
 */
function trimRight(str, type) {
    if (type === '_') {
        // full slurp
        if (String.prototype.trimRight) {
            return str.trimRight();
        }
        else {
            return str.replace(/[\s\uFEFF\xA0]+$/, '');
        }
    }
    else {
        // type must be '-'
        return str.replace(/(?:[\s\uFEFF\xA0]|\r\n)$/, ''); // TODO: make sure this gets \r\n
    }
}

// Version 1.0.32
function Parse(str, tagOpen, tagClose) {
    var powerchars = new RegExp('([|()]|=>)|' +
        '\'(?:\\\\[\\s\\w"\'\\\\`]|[^\\n\\r\'\\\\])*?\'|`(?:\\\\[\\s\\w"\'\\\\`]|[^\\\\`])*?`|"(?:\\\\[\\s\\w"\'\\\\`]|[^\\n\\r"\\\\])*?"' + // matches strings
        '|\\/\\*[^]*?\\*\\/|((\\/)?(-|_)?' +
        tagClose +
        ')', 'g');
    var tagOpenReg = new RegExp('([^]*?)' + tagOpen + '(-|_)?\\s*', 'g');
    var startInd = 0;
    var trimNextLeftWs = '';
    function parseTag() {
        // console.log(JSON.stringify(match))
        var currentObj = { f: [], d: [] };
        var numParens = 0;
        var filterNumber = 0;
        var firstChar = str[startInd];
        var currentAttribute = 'c'; // default - Valid values: 'c'=content, 'f'=filter, 'fp'=filter params, 'p'=param, 'n'=name
        var currentType = 'r'; // Default
        startInd += 1; // assume we're gonna skip the first character
        if (firstChar === '~' || firstChar === '#' || firstChar === '/') {
            currentAttribute = 'n';
            currentType = firstChar;
        }
        else if (firstChar === '!' || firstChar === '?') {
            // ? for custom
            currentType = firstChar;
        }
        else {
            startInd -= 1;
        }
        function addAttrValue(indx, strng) {
            var valUnprocessed = str.slice(startInd, indx) + (strng || '');
            // console.log(valUnprocessed)
            var val = valUnprocessed.trim();
            if (currentAttribute === 'f') {
                currentObj.f[filterNumber - 1][0] += val; // filterNumber - 1 because first filter: 0->1, but zero-indexed arrays
            }
            else if (currentAttribute === 'fp') {
                currentObj.f[filterNumber - 1][1] += val;
            }
            else if (currentAttribute === 'err') {
                if (val) {
                    var found = valUnprocessed.search(/\S/);
                    ParseErr('invalid syntax', str, startInd + found);
                }
            }
            else if (currentAttribute) {
                // if (currentObj[currentAttribute]) { // TODO make sure no errs
                //   currentObj[currentAttribute] += val
                // } else {
                currentObj[currentAttribute] = val;
                // }
            }
            startInd = indx + 1;
        }
        var m;
        // tslint:disable-next-line:no-conditional-assignment
        while ((m = powerchars.exec(str)) !== null) {
            var char = m[1];
            var tagClose = m[2];
            var slash = m[3];
            var wsControl = m[4];
            var i = m.index;
            if (char) {
                // Power character
                if (char === '(') {
                    if (numParens === 0) {
                        if (currentAttribute === 'n') {
                            addAttrValue(i);
                            currentAttribute = 'p';
                        }
                        else if (currentAttribute === 'f') {
                            addAttrValue(i);
                            currentAttribute = 'fp';
                        }
                    }
                    numParens++;
                }
                else if (char === ')') {
                    numParens--;
                    if (numParens === 0 && currentAttribute !== 'c') {
                        // Then it's closing a filter, block, or helper
                        addAttrValue(i);
                        currentAttribute = 'err'; // Reset the current attribute
                    }
                }
                else if (numParens === 0 && char === '|') {
                    addAttrValue(i); // this should actually always be whitespace or empty
                    currentAttribute = 'f';
                    filterNumber++;
                    //   TODO if (!currentObj.f) {
                    //     currentObj.f = [] // Initial assign
                    //   }
                    currentObj.f[filterNumber - 1] = ['', ''];
                }
                else if (char === '=>') {
                    addAttrValue(i);
                    startInd += 1; // this is 2 chars
                    currentAttribute = 'res';
                }
            }
            else if (tagClose) {
                addAttrValue(i);
                startInd += tagClose.length - 1;
                tagOpenReg.lastIndex = startInd;
                // console.log('tagClose: ' + startInd)
                trimNextLeftWs = wsControl;
                if (slash && currentType === '~') {
                    currentType = 's';
                } // TODO throw err
                currentObj.t = currentType;
                return currentObj;
            }
        }
        // TODO: Do I need this?
        ParseErr('unclosed tag', str, str.length);
        return currentObj; // To prevent TypeScript from erroring
    }
    function parseContext(parentObj, firstParse) {
        parentObj.b = []; // assume there will be blocks
        var lastBlock = false;
        var buffer = [];
        function pushString(strng, wsAhead) {
            if (strng) {
                var stringToPush = strng.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                if (wsAhead) {
                    stringToPush = trimRight(stringToPush, wsAhead);
                }
                if (trimNextLeftWs) {
                    stringToPush = trimLeft(stringToPush, trimNextLeftWs);
                    trimNextLeftWs = '';
                }
                buffer.push(stringToPush);
            }
        }
        // Random TODO: parentObj.b doesn't need to have t: #
        var tagOpenMatch;
        // tslint:disable-next-line:no-conditional-assignment
        while ((tagOpenMatch = tagOpenReg.exec(str)) !== null) {
            var precedingString = tagOpenMatch[1];
            var ws = tagOpenMatch[2];
            pushString(precedingString, ws);
            startInd = tagOpenMatch.index + tagOpenMatch[0].length;
            var currentObj = parseTag();
            // ===== NOW ADD THE OBJECT TO OUR BUFFER =====
            var currentType = currentObj.t;
            if (currentType === '~') {
                currentObj = parseContext(currentObj); // currentObj is the parent object
                buffer.push(currentObj);
            }
            else if (currentType === '/') {
                if (parentObj.n === currentObj.n) {
                    if (lastBlock) {
                        // If there's a previous block
                        lastBlock.d = buffer;
                        parentObj.b.push(lastBlock);
                    }
                    else {
                        parentObj.d = buffer;
                    }
                    // console.log('parentObj: ' + JSON.stringify(parentObj))
                    return parentObj;
                }
                else {
                    ParseErr("Helper start and end don't match", str, tagOpenMatch.index + tagOpenMatch[0].length);
                }
            }
            else if (currentType === '#') {
                if (lastBlock) {
                    // If there's a previous block
                    lastBlock.d = buffer;
                    parentObj.b.push(lastBlock);
                }
                else {
                    parentObj.d = buffer;
                }
                lastBlock = currentObj; // Set the 'lastBlock' object to the value of the current block
                buffer = [];
            }
            else {
                buffer.push(currentObj);
            }
            // ===== DONE ADDING OBJECT TO BUFFER =====
        }
        if (firstParse) {
            // TODO: more intuitive
            pushString(str.slice(startInd, str.length));
            parentObj.d = buffer;
        }
        return parentObj;
    }
    var parseResult = parseContext({ f: [], d: [] }, true);
    // console.log(JSON.stringify(parseResult))
    return parseResult.d; // Parse the very outside context
}
// TODO: Don't add f[] by default. Use currentObj.f[currentObj.f.length - 1] instead of using filterNumber

function CompileToString(str, tagOpen, tagClose) {
    var buffer = Parse(str, tagOpen, tagClose);
    return ParseScope(buffer)
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}
// TODO: Use type intersections for TemplateObject, etc.
// so I don't have to make properties mandatory
function parseHelper(res, descendants, params, name) {
    var ret = '{exec:function(' + res + '){' + ParseScope(descendants) + '},params:[' + params + ']';
    if (name) {
        ret += ",name:'" + name + "'";
    }
    ret += '}';
    return ret;
}
function parseBlocks(blocks) {
    var ret = '[';
    for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        ret += parseHelper(block.res || '', block.d || [], block.p || '', block.n || '');
        if (i < blocks.length) {
            ret += ',';
        }
    }
    ret += ']';
    return ret;
}
function ParseScope(buff) {
    var i = 0;
    var buffLength = buff.length;
    var returnStr = "var tR='';";
    for (i; i < buffLength; i++) {
        var currentBlock = buff[i];
        if (typeof currentBlock === 'string') {
            var str = currentBlock;
            // we know string exists
            returnStr += "tR+='" + str.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "';";
        }
        else {
            var type = currentBlock.t; // ~, s, !, ?, r
            var content = currentBlock.c || '';
            var filters = currentBlock.f || [];
            var name = currentBlock.n || '';
            var params = currentBlock.p || '';
            var res = currentBlock.res || '';
            var blocks = currentBlock.b || [];
            if (type === 'r') {
                var filtered = filter(content, filters);
                returnStr += 'tR+=' + filtered + ';';
                // reference
            }
            else if (type === '~') {
                // helper
                // TODO: native helpers
                var helperReturn = "Sqrl.H['" + name + "'](" + parseHelper(res, currentBlock.d, params);
                if (blocks) {
                    helperReturn += ',' + parseBlocks(blocks);
                }
                helperReturn += ')';
                helperReturn = filter(helperReturn, filters);
                returnStr += 'tR+=' + helperReturn + ';';
            }
            else if (type === 's') {
                returnStr += 'tR+=' + filter("Sqrl.H['" + name + "'](" + params + ')', filters) + ';';
                // self-closing helper
            }
            else if (type === '!') {
                // execute
                returnStr += content + ';';
            }
        }
    }
    return returnStr + 'return tR';
}
function filter(str, filters) {
    for (var i = 0; i < filters.length; i++) {
        var name = filters[i][0];
        var params = filters[i][1];
        str = "Sqrl.F['" + name + "'](" + str;
        if (params) {
            str += ',' + params;
        }
        str += ')';
    }
    return str;
}

function Compile(str, tagOpen, tagClose) {
    return new Function('it', 'Sqrl', CompileToString(str, tagOpen, tagClose)); // eslint-disable-line no-new-func
}
// console.log(Compile('hi {{this}} hey', '{{', '}}').toString())

function Render(template, options) {
    var templateFunc = Compile(template, '{{', '}}');
    return templateFunc(options, {});
}

// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)

export { CompileToString, Compile, Parse, Render };
//# sourceMappingURL=squirrelly-next.es5.js.map