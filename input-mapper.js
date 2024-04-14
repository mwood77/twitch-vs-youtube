const robot = require("robotjs");
const REF = require('./resources/input-map');
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8070/1');

const validInput = [
    'U','UP','D','DOWN','L','LEFT','R','RIGHT',
    'A','B','X','Y','START','SELECT','LTRIG',
    'RTRIG','Z','ZTRIG','CENTERCAM',
];

const controllerStates = {
    connected : {
        1: true,
        2: true,
    },
    time: 0,
};

/**
 * logs keypresses and author to console.aaaaaaaaa
 * aa
 * @param {string} key the input
 * @param {string?} author youtube or twitch username (if available)
 */
function logInput(key, author, player) {

    // @todo - this is a hack, make it better
    // Controllers configed as:
    // YOUTUBE_CONTROLLER=1
    // TWITCH_CONTROLLER=2
    // therefore, we can deduce the platform based upon this

    const message = {
        user: author != null ? author : '',
        action: key,
        platform: player == 1 ? 'youtube' : 'twitch',
    }

    ws.send(JSON.stringify(message))
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
    const sanitized = keys.flatMap(el => validInput.filter(v => v === el.toUpperCase()));
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

    const player = accessor.split('_')[1];

    logInput(keys, author, player);

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
 * Emit cursor move events
 * 
 * @param {string} defaultMoveDirection Which way to move the cursor, accpets UP, DOWN, LEFT, RIGHT
 * @param {number} shouldClick - Whether to click, accepts LCLICK or RCLICK
 */
 async function moveMouse(defaultMoveDirection, shouldClick) {
     const currentMousePosition = robot.getMousePos();
     const defaultMoveAmount = 100; // 100 pixels

    switch (defaultMoveDirection) {
        case 'UP':
            robot.moveMouseSmooth(currentMousePosition.x, (currentMousePosition.y + defaultMoveAmount));
            break;
        case 'DOWN':
            robot.moveMouseSmooth(currentMousePosition.x, (currentMousePosition.y - defaultMoveAmount));
            break;
        case 'LEFT':
            robot.moveMouseSmooth((currentMousePosition.x - defaultMoveAmount), currentMousePosition.y);
            break;
        case 'RIGHT':
            robot.moveMouseSmooth((currentMousePosition.x + defaultMoveAmount), currentMousePosition.y);
            break;
   }

    if (shouldClick) {
        mouseClick(shouldClick, true)
    }

    return Promise.resolve();
}

// function handleMouseBorders(x, y) {
//     const windowBorders = {
//         width: process.env.WINDOW_WIDTH,
//         height: process.env.WINDOW_HEIGHT
//     }

//     const currentMousePosition = robot.getMousePos();
//     console.log("borders: %s, %s"+ windowBorders.width, windowBorders.height)
    
//     console.log("current mouse: %s, %s"+ currentMousePosition.x, currentMousePosition.y)
//     if (currentMousePosition.x + x > windowBorders.width) {
//         console.log("me move!")
//         return robot.moveMouseSmooth(windowBorders.width, 0)
//     }
//     if (currentMousePosition.y + y > windowBorders.height) {
//         console.log("me also move")
//         return robot.moveMouseSmooth(0, windowBorders.height)
//     }
//     console.log("me too move")
//     return robot.moveMouseSmooth(x, y);
// }

/**
 * Emit scroll events, usually used to move the viewport
 * 
 * @param {string} horizontalOrVertical Which way to scroll, accepts HORIZONTAL and VERTICAL
 * @param {number} amount how many pixels to scroll, negative values are LEFT or DOWN, positive values are RIGHT or UP
 */
async function mouseScroll(horizontalOrVertical, amount) {
    switch (horizontalOrVertical) {
        case 'HORIZONTAL':
            if (amount < 0) {
                robot.scrollMouse(-200, 0);
            } else {
                //scroll right
                robot.scrollMouse(200, 0);
            }
        case 'VERTICAL':
            if (amount < 0) {
                //scroll down
                robot.scrollMouse(0, -200);
            } else {
                //scroll up
                robot.scrollMouse(0, 200);
            }
    }
    return Promise.resolve();
}

/**
 * Emit mouse click events
 * 
 * @param {string} button Which mouse button to click, accepts LCLICK, MCLICK, RCLICK
 * @param {boolean} double Whether to double-click
 */
async function mouseClick(button, double) {
    if (button == 'LCLICK') {
        handleClick('left', double)
    } else if (button == 'MCLICK') {
        handleClick('middle', double)
    } else {
        handleClick('right', double)
    }
}

function handleClick(button, double) {
    if (double) {
        for (let i = 0; i < 2; i++ ) {
            robot.mouseToggle('down', button);
            setTimeout(function() {
                robot.mouseToggle("up");
            }, 100);
        }
    } else {
        robot.mouseToggle('down', button);
        setTimeout(function() {
            robot.mouseToggle("up");
        }, 100);
    }

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
async function inputMapper(key, modifier, author, player) {

    const accessor = 'CONTROLLER_' + player;

    if (!controllerStates.connected[player] && Date.now() < controllerStates.time + 7000) return;

    if(key.includes('+')) {
        comboInput(key.split('+'), author, accessor);
    };
    const inputToUpperCase = key.toUpperCase();
    switch (inputToUpperCase) {

        // KEYBOARD & GAMEPAD EVENTS
        case 'U': 
        case 'UP': 
            logInput(key, author, player);
            holdInput(REF.INPUT[accessor].UP, modifier);
            break;
        case 'D':
        case 'DN':
        case 'DOWN':
            logInput(key, author, player);
            holdInput(REF.INPUT[accessor].DOWN, modifier);
            break;
        case 'L':
        case 'LEFT':
            logInput(key, author, player);
            holdInput(REF.INPUT[accessor].LEFT, modifier);
            break;
        case 'R':
        case 'RIGHT':
            logInput(key, author, player);
            holdInput(REF.INPUT[accessor].RIGHT, modifier);
            break;
        case 'A':
            logInput(key, author, player);
            tapOrRepititiveTapInput(REF.INPUT[accessor].A, modifier);
            break;
        case 'B':
            logInput(key, author, player);
            tapOrRepititiveTapInput(REF.INPUT[accessor].B, modifier);
            break;
        case 'X':
            logInput(key, author, player);
            tapOrRepititiveTapInput(REF.INPUT[accessor].X, modifier);
            break;
        case 'Y':
            logInput(key, author, player);
            tapOrRepititiveTapInput(REF.INPUT[accessor].Y, modifier);
            break;
        case 'START':
            logInput(key, author, player);
            tapOrRepititiveTapInput(REF.INPUT[accessor].START, modifier);
            break;
        case 'SELECT':
            logInput(key, author, player);
            tapOrRepititiveTapInput(REF.INPUT[accessor].SELECT, modifier);
            break;
        case 'LTRIG':
            logInput(key, author, player);
            tapOrRepititiveTapInput(REF.INPUT[accessor].LTRIG, modifier);
            break;
        case 'RTRIG':
            logInput(key, author, player);
            tapOrRepititiveTapInput(REF.INPUT[accessor].RTRIG, modifier);
            break;
        
        // MOUSE CURSOR EVENTS
        case 'MOUSE LEFT':
        case 'POINTER LEFT':
        case 'CURSOR LEFT':
        case 'MOUSELEFT':
        case 'MSL':
            logInput(key, author, player);
            await moveMouse('LEFT');
            break;
        case 'MOUSE RIGHT':
        case 'POINTER RIGHT':
        case 'CURSOR RIGHT':
        case 'MOUSERIGHT':
        case 'MSR':
            logInput(key, author, player);
            await moveMouse('RIGHT');
            break;
        case 'MOUSE UP':
        case 'POINTER UP':
        case 'CURSOR UP':
        case 'MOUSEUP':
        case 'MSU':
            logInput(key, author, player);
            await moveMouse('UP');
            break;
        case 'MOUSE DOWN':
        case 'POINTER DOWN':
        case 'CURSOR DOWN':
        case 'MOUSEDOWN':
        case 'MSD':
            logInput(key, author, player);
            await moveMouse('DOWN');
            break;
        
        // MOUSE MOVE EVENTS (RPGs where point & click to move)
        case 'MOVE LEFT':
        case 'MVL':
            logInput(key, author, player);
            moveMouse('LEFT', 'LCLICK');
            break;
        case 'MOVE RIGHT':
        case 'MVR':
            logInput(key, author, player);
            moveMouse('RIGHT', 'LCLICK');
            break;
        case 'MOVE UP':
        case 'MVU':
            logInput(key, author, player);
            moveMouse('UP', 'LCLICK');
            break;
        case 'MOVE DOWN':
        case 'MVD':
            logInput(key, author, player);
            moveMouse('DOWN', 'LCLICK');
            break;
        
        // MOUSE CLICKS
        case 'LEFT CLICK':
        case 'L CLICK':
        case 'LCLICK':
        case 'LCL':
            mouseClick('LCLICK', false);
            break;
        case 'RIGHT CLICK':
        case 'R CLICK':
        case 'RCLICK':
        case 'RCL':
            mouseClick('RCLICK', false);
            break;
        

        // SCROLL EVENTS
        case 'SCROLL LEFT':
        case 'SCRLL':
            logInput(key, author, player);
            mouseScroll('HORIZONTAL', -1);
            break;
        case 'SCROLL RIGHT':
            case 'SCRLR':
            logInput(key, author, player);
            mouseScroll('HORIZONTAL', 1);
            break;
        case 'SCROLL UP':
        case 'SCRLU':
            logInput(key, author, player);
            mouseScroll('VERTICAL', 1);
            break;
        case 'SCROLL DOWN':
        case 'SCRLD':
            logInput(key, author, player);
            mouseScroll('VERTICAL', -1);
            break;


        case 'Z':
        case 'ZTRIG':
            break;
            // logInput(key, author, player);
            // tapOrRepititiveTapInput(key, modifier);
            // break;
        case 'CC':
        case 'CENTERCAM':
            break;
            // Super Mario 64 Specific
            // logInput('centering camera', author, player);
            // centerCamera(['u', 'j']); // [0] = zoom in, [1] = zoom out
            // break;
        case 'QUIT-IT':
        case 'IM-CALLING-MOM':
        case 'STOP-IT':
        case 'MOM':
        case 'MOOOOOOOOOOM':
            unplugController(player);
            break;
        case 'DAD':
            logInput('ARE YA WINNIN\'? - 👨‍🦳')
            break;
        default:
            break;
    }

    return Promise.resolve();
}

/**
 * 'Unplugs the controller' of the opposite player
 *  by disabling input.
 * 
 * @param {integer} player controller posotion
 */
function unplugController(player) {
    // map to opposite player of unplug requested by
    const enemy = player === 1 ? 2 : 1
    if (controllerStates.connected[enemy]) {
        controllerStates.connected[enemy] = !controllerStates.connected[enemy];
        controllerStates.time = Date.now();
    }

    // This needs to be the opposite of what's set in our env file.
    const humanReadable = enemy === 1 ? 'twitch' : 'youtube'
    logInput(`${humanReadable.toLocaleUpperCase()}'S CONTROLLER UNPLUGGED! - 🎮`);
    logInput(`WAIT 7 SECONDS OR CALL MOM - 🎮`);
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
const sampleInput1 = [
    'MVL',
    'MVU',
    'MVR',
    'MVD',
    'SCRLL',
    'SCRLU',
    'SCRLD',
    'SCRLR',
//     'DOWN+LEFT+X',
//     'down+right+x',
//     'UP15',
//     'IM-CALLING-MOM',
//     'A12',
//     'down+right+x',
//     'B12',
//     'down+right+x',
//     'START6',
//     'DOWN+LEFT+X',
//     'down+right+x',
//     'UP15',
//     'A12',
//     'down+right+x',
//     'B12',
//     'down+right+x',
//     'START6',
//     'dad'
];

// const sampleInput2 = [
//     'UP15',
//     'A12',
//     'down+right+x',
//     'B12',
//     'LEFT15,DOWN+RIGHT+X,UP+A10,A12,B12,down+right+x',
//     'IM-CALLING-MOM',
//     'X12',
//     'Y12',
//     'down+right+x',
//     'START6',
//     'down+right+x',
//     'UP15',
//     'A12',
//     'down+right+x',
//     'B12',
//     'LEFT15,DOWN+RIGHT+X,UP+A10,A12,B12,down+right+x',
//     'X12',
//     'Y12',
//     'down+right+x',
//     'START6',
//     'down+right+x',
//     'UP15',
//     'A12',
//     'down+right+x',
//     'B12',
//     'LEFT15,DOWN+RIGHT+X,UP+A10,A12,B12,down+right+x',
//     'X12',
//     'Y12',
//     'down+right+x',
//     'START6',
//     'down+right+x',
// ];

setTimeout(function(){
    // sampleInput1.forEach(
    //     (el, i) => {
    //         translateInput(el, 'INPUT-1', 1).then(translateInput(sampleInput2[i], 'INPUT-2', 2))
    //     }
    // );
    sampleInput1.forEach(
        (el, i) => {
            translateInput(el, 'INPUT-1', 1)
        }
    );
}, 2000);

module.exports = { 
    translateInput 
};