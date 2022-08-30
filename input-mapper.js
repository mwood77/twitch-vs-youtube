const robot = require("robotjs");
const REF = require('./resources/input-map');

const validInput = [
    'U','UP','D','DOWN','L','LEFT','R','RIGHT',
    'A','B','X','Y','START','SELECT','LTRIG',
    'RTRIG','Z','ZTRIG','CENTERCAM',
];

function logInput(key, author) {
    author != null ?
        console.info ('user: ' + author + '\n  action: ' + key  ) :
        console.info('action: ' + key);
}

/**
 * Single action hold. This is primarily designed to emulate an analog joystick.
 * Button is held 60ms * modifier. 
 * Example, 60ms * 15 = button held for 900ms.
 * 
 * @param {string} action key action to emit
 * @param {number} modifier duration to emit action
 */
function holdInput(action, modifier) {
    for (let i = 0; i <= modifier; i++) {
        robot.setKeyboardDelay(60);
        robot.keyToggle(action, 'down');
    }
    robot.keyToggle(action, 'up');
}
/**
 * Single tap without modifier present. If modifier is present
 * it'll tap the action a modifier amount of times
 * 
 * @param {string} action key action to emit
 * @param {number} modifier duration to emit action
 */
function tapOrRepititiveTapInput(action, modifier) {
    if (modifier != null) {
        for (let i = 0; i < modifier; i++) {
            robot.keyToggle(action.toLowerCase(), 'down');
            robot.setKeyboardDelay(60);
            robot.keyToggle(action.toLowerCase(), 'up');
        }
    } else {
        robot.keyToggle(action.toLowerCase(), 'down');
        robot.setKeyboardDelay(60);
        robot.keyToggle(action.toLowerCase(), 'up');
    }
}

/**
 * Removes invalid inputs prior to actioning in combo calls or otherwise
 * 
 * @param {array} keys an array of inputs to sanitize
 * @param {string} accessor `CONTROLLER_#` reference passed by parent function(s)
 * @returns {array} an array of allow listed inputs
 */
function sanitizeInput(keys, accessor) {
    const sanitized = keys.flatMap(el => validInput.filter(v => v === el));
    const sanitizedWithoutNumbers = sanitized.filter(el => findNumberAtIndex(el) < 0);

    return sanitizedWithoutNumbers.flatMap(el => REF.INPUT[accessor][el.toUpperCase()]);
}

/**
 * Holds key[0] down, then toggles key[1], then release both
 * 
 * @param {array} keys the actions to combo press.
 * @param {string} author author of the action
 * @param {array} accessor input accessor, passed from inputMapper function
 */
function comboHoldFirstInput(keys, author, accessor) {
    const allowList = sanitizeInput(keys, accessor);
    logInput(keys, author);

    robot.keyToggle(allowList[0].toLowerCase(), 'down',);
    robot.setKeyboardDelay(75);

    allowList.slice(1).forEach(el => {
        robot.keyToggle(el.toLowerCase(), 'down');
        robot.keyToggle(el.toLowerCase(), 'up');
    });

    robot.keyToggle(allowList[0].toLowerCase(), 'up');
}

/**
 * Iterates through a list of keys with a slight overlap between each keypress
 * 
 * Ex. `DOWN+RIGHT+X` to hadoken in SF2
 * 
 * @param {array} keys the actions to combo press.
 * @param {string} author author of the action
 * @param {array} accessor input accessor, passed from inputMapper function
 */
function comboInput(keys, author, accessor) {
    
    const allowList = sanitizeInput(keys, accessor);
    robot.setKeyboardDelay(75);
    // Prefer to log unsanitized input, 
    // so users don't realize filtering
    // is happenning.
    logInput(keys, author);

    allowList.forEach((el, i) => {
        robot.keyToggle(el.toLowerCase(), 'down');
        if (i > 0) {
            robot.keyToggle(allowList[i - 1].toLowerCase(), 'up');
        };
    });
    robot.keyToggle(allowList[allowList.length - 1].toLowerCase(), 'up');
}

/**
 * Modified version of comboInput, used to center the camera for Super Mario 64
 * 
 * @param {array} keys the actions to combo press. Position 0 is always held.
 */
 function centerCamera(keys) {
    robot.setKeyboardDelay(60);
    robot.keyToggle(keys[0], 'down');
    robot.keyToggle(keys[0], 'up');
    robot.setKeyboardDelay(75);
    setTimeout(() => {
        robot.keyToggle(keys[1], 'down');
        robot.setKeyboardDelay(60);
        robot.keyToggle(keys[1], 'up');
    }, 1500)
}

/**
 * Emits keyboard events, or redirects to child functions to emit
 * more complex keyboard events.
 * 
 * @param {string} key input to action
 * @param {integer} modifier used to repeat or hold 
 * @param {string|null} author author of the action
 * @param {integer} player controller position
 */
function inputMapper(key, modifier, author, player) {

    const accessor = 'CONTROLLER_' + player;

    if(key.includes('+')) {
        comboInput(key.split('+'), author, accessor);
    };
    const inputToUpperCase = key.toUpperCase();
    switch (inputToUpperCase) {
        case 'U': 
        case 'UP': 
            logInput(key, author);
            holdInput(REF.INPUT[accessor].UP, modifier);
            break;
        case 'D':
        case 'DOWN':
            logInput(key, author);
            holdInput(REF.INPUT[accessor].DOWN, modifier);
            break;
        case 'L':
        case 'LEFT':
            logInput(key, author);
            holdInput(REF.INPUT[accessor].LEFT, modifier);
            break;
        case 'R':
        case 'RIGHT':
            logInput(key, author);
            holdInput(REF.INPUT[accessor].RIGHT, modifier);
            break;
        case 'A':
            logInput(key, author);
            tapOrRepititiveTapInput(REF.INPUT[accessor].A, modifier);
            break;
        case 'B':
            logInput(key, author);
            tapOrRepititiveTapInput(REF.INPUT[accessor].B, modifier);
            break;
        case 'X':
            logInput(key, author);
            tapOrRepititiveTapInput(REF.INPUT[accessor].X, modifier);
            break;
        case 'Y':
            logInput(key, author);
            tapOrRepititiveTapInput(REF.INPUT[accessor].Y, modifier);
            break;
        case 'START':
            logInput(key, author);
            tapOrRepititiveTapInput(REF.INPUT[accessor].START, modifier);
            break;
        case 'SELECT':
            logInput(key, author);
            tapOrRepititiveTapInput(REF.INPUT[accessor].SELECT, modifier);
            break;
        case 'LTRIG':
            logInput(key, author);
            tapOrRepititiveTapInput(REF.INPUT[accessor].LTRIG, modifier);
            break;
        case 'RTRIG':
            logInput(key, author);
            tapOrRepititiveTapInput(REF.INPUT[accessor].RTRIG, modifier);
            break;
        case 'Z':
        case 'ZTRIG':
            break;
            // logInput(key, author);
            // tapOrRepititiveTapInput(key, modifier);
            // break;
        case 'CC':
        case 'CENTERCAM':
            break;
            // Super Mario 64 Specific
            // logInput('centering camera', author);
            // centerCamera(['u', 'j']); // [0] = zoom in, [1] = zoom out
            // break;
        default:
            break;
    }
}

/**
 * Locates the position of a number within a string. If no number is present, -1 is returned.
 * 
 * @param {string} string string to locate number position
 * @returns {number} the index position of the first number
 */
function findNumberAtIndex(string) {
    var num = /\d/;
    var nums = string.match(num);
    return string.indexOf(nums);
}

/**
 * deconstructs input. Find whether modifiers are present.
 * 
 * @param {string} key a comma delimited string of movement actions with or without modifiers
 * @param {string|null} author author of action
 * @param {integer} player controller position
 */
function translateInput(key, author, player) {
    key.split(',').forEach(e => {
        const multiplyerPosition = findNumberAtIndex(e);
        
        if (multiplyerPosition < 0) {
            // no modifier
            inputMapper(e, null, author, player);
        } else {
            inputMapper(e.slice(0, multiplyerPosition), e.slice(multiplyerPosition, e.length), author, player);
        }
    });
}

/**
 * Use to debug input functions
 */
// const sampleInput = [
//     'LEFT15,DOWN+RIGHT+X,UP+A10',
//     // 'DOWN+RIGHT+X',
//     // 'DOWN+LEFT+X',
//     // 'UP15',
//     // 'A12',
//     // 'B12',
//     // 'X12',
//     // 'Y12',
//     // 'LTRIG12',
//     // 'RTRIG12',
//     // 'START6',
// ];
// setTimeout(function(){
//     sampleInput.forEach(
//         el => {
//             translateInput(el, 'test_input_1', 1)
//             // translateInput(el, 'test_input_2', 2)
//         }
//     );
// }, 2000);

module.exports = { 
    translateInput 
};