/* application specific logic */

import 'jquery';
import 'jquery-contextmenu';
import 'jQuery-Impromptu';

import conference from './conference';
import API from './modules/API';
import keyboardshortcut from './modules/keyboardshortcut/keyboardshortcut';
import remoteControl from './modules/remotecontrol/RemoteControl';
import translation from './modules/translation/translation';
import UI from './modules/UI/UI';

window.APP = {
    API,
    conference,

    // Used by do_external_connect.js if we receive the attach data after
    // connect was already executed. status property can be 'initialized',
    // 'ready', or 'connecting'. We are interested in 'ready' status only which
    // means that connect was executed but we have to wait for the attach data.
    // In status 'ready' handler property will be set to a function that will
    // finish the connect process when the attach data or error is received.
    connect: {
        handler: null,
        status: 'initialized'
    },

    // Used for automated performance tests.
    connectionTimes: {
        'index.loaded': window.indexLoadedTime
    },

    keyboardshortcut,
    remoteControl,
    translation,
    UI
};

const VIDEOS = ".videocontainer";

window._globals = {
    scale: 1,
    height: 455
};

window.videos = {
    newHeight(heightPx) {
        window._globals.height = heightPx;
        $(VIDEOS).css({ "height": "455px !important" });
    },
    newScale(scale) {
        window._globals.scale = scale;
        $(VIDEOS).css({ "transform": `scale(${scale}, ${scale})` });
    }
};

window.fixVideos = function(px) {
    $(".videocontainer").css({'min-width' : `${px}px`, 'width' : `${px}px`, 'max-width' : `${px}px` });
};

window.fixFlow = function() {

};

// TODO The execution of the mobile app starts from react/index.native.js.
// Similarly, the execution of the Web app should start from react/index.web.js
// for the sake of consistency and ease of understanding. Temporarily though
// because we are at the beginning of introducing React into the Web app, allow
// the execution of the Web app to start from app.js in order to reduce the
// complexity of the beginning step.
import './react';
