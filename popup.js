var config,
    movie,
    movies_ids,
    t_session_id,
    u_cookie,
    u_token,
    total_done = 0;


function processTPB(data) {
    var d, data2, c, torrent;
    
    d = document.getElementById("log");


    data2 = data.substr(data.indexOf('<body>')+6);
    data2 = data2.replace(/\<iframe.*?\/iframe\>/g,'');
    data2 = data2.replace(/\<form.*?\/form\>/g,'');

    d.innerHTML = data2;

    c=0;
    torrent = new Array;

    $('a[href^="http://torrents.thepiratebay.org/"]').each(function()
    {
//           console.log("torrent "+ c + ":" + $(this).attr("href"));

        var t, 
            text,
            p,
            unit,
            val;

        t = new Object;
        t.url = $(this).attr("href");

        text =  $(this).parent().text();

        p = text.indexOf("MiB");

        if ( p  < 0 )  p = text.indexOf("GiB");


        if ( p  > 0 ) {

            unit = text.substr(p,3);
            val = text.substr(p-8,7);

            val = val.replace(/[^\d,.]/g, '');

            if (unit == 'MiB') {
                t.size = parseFloat(val) ;
            } else if (unit == 'GiB') {
                t.size = parseFloat(val) * 1024;
            }
        }


        if ( t.size && t.size > config.min_size && t.size < config.max_size ) {
            torrent[c++] = t;
        }
    });

    log( "Encontré " + c + " torrents");

    return torrent[0];
}


function addTorrent(torrent, allow_restart) {
    var xhr;

    status("Hablando con Transmission...","info");

    xhr = $.ajax({
        type: "POST",
        headers: {"X-Transmission-Session-Id": t_session_id},
        url: "http://localhost:9091/transmission/rpc",  
        data: JSON.stringify({ "method": "torrent-add", "tag": 39693, "arguments": { "filename": torrent.torrent_url }}), 
        dataType: "json",
        success: function(d) {
            log(torrent.title + " added to Transmission " + d.result );
            if (d.result=="duplicate torrent") {
                torrent.transmission_duplicate=1;
                torrent.done = 1;
                status("Torrent duplicado: " + torrent.title,"error");
            }
            else if (d.result.match(/404/)) {
                status("Error en torrent :-( : " + torrent.title,"error");
                torrent.done = 1;
            }
            else if (d && d.arguments["torrent-added"]) {
                status("Torrent agregado!! :-) " + torrent.title, "success");
                torrent.transmission_tid = d.arguments["torrent-added"].id;
                torrent.transmission_hash = d.arguments["torrent-added"].hashString;
                torrent.done = 1;
            }

            saveStorage();
            updateDisplay();
        },
        statusCode: {
            409: function() {
                t_session_id = xhr.getResponseHeader("X-Transmission-Session-Id");
                console.log("409...working! =>" + t_session_id );
                if (allow_restart) addTorrent(torrent,0);
            }
        }
    });
}



function u_base_url()  {

    var ret = 
        "http://"
        + config.utorrent_user
        + ":"
        + config.utorrent_pass
        + "@"
        + config.utorrent_host
        + ":"
        + config.utorrent_port
        + "/gui/"
        ;

    return ret;
}



function addUTorrent(m, allow_restart) {

    status("Hablando con uTorrent...","info");
    var url =
        u_base_url()
        + "?action=add-url&s="
        +  m.torrent_url
        + "&token="
        + u_token
        ;
    

    $.ajax({
        type: "GET",
        url: url,
        success: function(d) {
            log(m.title + " added to uTorrent");
            m.done = 1;
            saveStorage();
            updateDisplay();
        },
        statusCode: {
            400: function() {
                console.log("400...error auth");
                if (allow_restart) addUTorrent(torrent,0);
            }
        },
        error: function() {
            status("Falla al agregar a uTorrent. Revisa las opciones","error");
        }
    });
}




function getTPB(i,title,year) {

    var u = "http://thepiratebay.org/search/" + escape(title) + "%20" + year + "/0/99/200";

    $.get(
        u,
        function(data) {
            var t = processTPB(data); 
            movie[i].tried = 1;

            if ( typeof(t) != "undefined" && t.url) {
                movie[i].torrent_url = t.url;
                movie[i].torrent_size_mb= t.size;
            }
            saveStorage();
            updateDisplay();
        }
    );
}

function log(text) {
    console.log(text);
}

function status(text, type) { // info, warning, error, success

    log(text);

    type = typeof(type) != 'undefined' ? type : 'info';

    $("span.loader").show();
    
    $("#status").removeClass().addClass("alert-message");

    $("#status p").html(text);
    $("#status").addClass(type).fadeIn();

    setTimeout(function() {
        $("#status").fadeOut('fast', function(){
           $("#status").removeClass(type); 
           $("span.loader").hide();
        });
    }, 4000);
}

function hideTorrent(movie_id) {

    $("#movie-"+movie_id).fadeOut();
    movie[movie_id].done=1;
    total_done++;
    saveStorage();
}

function download2(movie_id) {

    $("#movie-" +  movie_id).fadeOut('slow');


    log("download de movie_id: " + movie_id);

    if (config.utorrent) add1_Utorrent(movie_id);
    if (config.transmission) add1_Transmission(movie_id);
    saveStorage();
}



function updateDisplay () {
    var i,
        movies,
        e;

    $("#movies").empty();

    total_done = 0;

    movies = [];

    for(i = 0, len = movies_ids.length; movie_id = movies_ids[i], i<len; i++) {

        e = movie[movie_id];
        e.movie_id = movie_id;
        e.title_escaped = escape(e.title);

        if (e.done) {
            total_done++;
            continue;
        }
        movies.push(e);
    }

    $("#movieTemplate").tmpl(movies).appendTo("#movies");
}

function storeScheduled(scheduled) {
    var i, e;
    movies_ids = new Array();
    for (i in scheduled.movies) {

        e = scheduled.movies[i];

        if ( ! movie[e.id] ) {

            movie[e.id]        = new Object;
            movie[e.id].title  = unescape(e.title);
            movie[e.id].year   = e.year;
            movie[e.id].status = "nueva";
            movie[e.id].url    = e.url;
            movie[e.id].img    = e.img;
            movie[e.id].when   = e.when;
            movie[e.id].movie_id   = e.id;
        }

        movies_ids.push(e.id);
    }
}

function saveStorage() {
    localStorage.setItem('ckplus', JSON.stringify(movie));
}

function refreshTorrents() {

    var i,
        e;

    log("buscando torrents");

    for(i = 0, len = movies_ids.length; movie_id = movies_ids[i], i < len; i++) {
        e = movie[movie_id];

        if (e.done) continue;

        if (! e.torrent_url && ! e.tried) {
            getTPB(movie_id, e.title,e.year);
        }
    }
}


function resetTransmission() {
    var i,
        e;

    $("#movies").empty();

    for (i in movie) {
        e = movie[i];
        if (e.done) continue;

        e.transmission_hash      = null;
        e.transmission_duplicate = null;
    }
    updateDisplay();
}


function updateTransmission() {
    var i,
        e;

    if ( config.transmission) {
        status("Actualizando Transmission...","info");
        for (i in movie) {
            e = movie[i];
            if (e.done) continue;

            if (! e.transmission_hash && ! e.transmission_duplicate) {
                addTorrent(e, 1);
            }
        }
    }
}

function getUTokens() {
    var url,
        i,
        e;

    url = u_base_url() + 'token.html';

    $.get(
        url, 
        function(data) {
            u_token = data.substr(data.indexOf("none;")+7,64); 
            for (i in movie) {
                e = movie[i];
                
                if (e.done) continue;

                if (! e.utorrent_ok ) {
                    addUTorrent(e, 1);
                }
            }

        }).error(function() { log("error con utorrent"); });
}


function add1_Utorrent(movie_id) {

    var url = u_base_url() + 'token.html';

    $.get(url, function(data) {
        u_token = data.substr(data.indexOf("none;")+7,64); 
        addUTorrent(movie[movie_id], 1);
    }).error(function() { status("Error con uTorrent.","error"); });
}


function add1_Transmission(movie_id) {

    var e = movie[movie_id];

    if (! e.transmission_hash && ! e.transmission_duplicate) {
        addTorrent(e, 1);
    }
}



function updateUtorrent() {

    if ( config.utorrent) {

        status("Actualizando uTorrent...","info");
        getUTokens();

    }
}




function getScheduled(id) {

    status("Contactando Cinemaki...","info");

    $.get(
        "http://www.cinemaki.com.ar/scheduled/" + id  
                + "/limit/24"
                + "/start/" + total_done ,
        function(data) {

            log("procesando Cinemaki");


            var scheduled = jQuery.parseJSON(data);

            status("Traje " + scheduled.movies.length + " pelis en tu agenda","success"); 

console.log(scheduled.user);
            $("#user").html(scheduled.user);

            storeScheduled(scheduled);
            updateDisplay();

            saveStorage();

            status("Buscando torrents...","info");
            refreshTorrents();

//                updateTransmission();
//                updateUtorrent();
        }
    );
}

function resyncme() {
    resetTransmission();
    getScheduled(config.ck_id);
}


function init() {

    // Retrieve the config from storage
    var t = localStorage.getItem('config');


    if (t) {
        config = JSON.parse(t);
    }
    else  {
        config = new Object;
        config.min_size = 500;
        config.max_size = 1600;
        config.ck_id    = 12;
        config.transmission    = false;
        config.utorrent        = false;
        config.download        = true;
        config.concurrent     = 10;
    }


    // Retrieve the object from storage
    t = localStorage.getItem('ckplus');

    if (t) {
        movie = JSON.parse(t);
    }
    else  {
        movie = new Object;
    }


    if (config.utorrent) 
        $("#met").html('uTorrent');

    if (config.transmission) 
        $("#met").html('Transmission');

    if (config.download) 
        $("#met").html('link a torrent');

    getScheduled(config.ck_id);
}

$(document).ready(function() {
    
    $("ul#movies").delegate("li", {
      mouseenter: function() { 
        $(this).children('.close').addClass('active');
      },
      mouseleave: function () {
        $(this).children('.close').removeClass('active');
      }
    });

    $("a.options").attr('href',chrome.extension.getURL("options.html"));

    init();
 });