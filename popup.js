onload = setTimeout(init,0);


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

        var t = new Object;

        t.url = $(this).attr("href");

        var text =  $(this).parent().text();

        var p = text.indexOf("MiB");

        if ( p  < 0 )  p = text.indexOf("GiB");


        if ( p  > 0 ) {

            var unit = text.substr(p,3);
            var val = text.substr(p-8,7);

            val = val.replace(/[^\d,.]/g, '');

/*                console.log("val:",val);
            console.log("unit:",unit);
*/                if (unit == 'MiB') {
                t.size = parseFloat(val) ;
            }
            else if (unit == 'GiB') {
                t.size = parseFloat(val) * 1024;
            }
//                console.log("size:",t.size);
        }


        if (t.size 
            && t.size > config.min_size
            && t.size < config.max_size
            ) {
            torrent[c++] = t;
        }
    });

    console.log( "Encontré " + c + " torrents");

    return torrent[0];
}


function addTorrent(torrent, allow_restart) {


    status("Hablando con Transmission...");

    var myload = JSON.stringify({
            "method": "torrent-add",
            "tag": 39693,
            "arguments": { "filename": torrent.torrent_url }
            }
    );

    log("agregando a transmission " + myload);

    var xhr = $.ajax({
            type: "POST",
            headers: {"X-Transmission-Session-Id": t_session_id},
            url: "http://localhost:9091/transmission/rpc",  
            data: myload , 
            dataType: "json",
            success: function(d) {

                log(torrent.title + " added to Transmission " + d.result );

                if (d.result=="duplicate torrent") {
                    torrent.transmission_duplicate=1;
                    torrent.done = 1;
                    status("torrent duplicado: " + torrent.title);
                }
                else if (d.result.match(/404/)) {
                    status("error en torrent :-( : " + torrent.title);
                    torrent.done = 1;
                }
                else if (d && d.arguments["torrent-added"]) {
                    status("torrent agregado!! :-) " + torrent.title);
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

    status("Hablando con uTorrent...");
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
            status("Falla al agregar a uTorrent. Revisa las opciones");
        }
    });
}




function getTPB(i,title,year) {

    var u = "http://thepiratebay.org/search/" + escape(title) + "%20" + year + "/0/99/200";

//        log("Buscando torrent para: " +  title + " => " + u);


    $.get(
        u,
        function(data) {

//                log("Procesando TPB");

            var t = processTPB(data); 
            movie[i].tried = 1;

            if ( typeof(t) != "undefined" && t.url) {
//                    log( title + "("+ i + ") => " + t.url);

                movie[i].torrent_url = t.url;
                movie[i].torrent_size_mb= t.size;


            }
            else {
            }
            saveStorage();
            updateDisplay();
        }
    );
}

function log(text) {
    //console.log(text);
}

function status(text) {

    log(text);

    // Update status to let user know options were saved.
    var status = document.getElementById("status");
    status.innerHTML = text;

    setTimeout(function() {
        status.innerHTML = "";
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

    $("#movies").empty();
    
    /*var movieList = document.getElementById('movies');

    movieList.innerHTML= '';*/

    total_done=0;
    var movies = [];

    for(var i=0,len = movies_ids.length; movie_id=movies_ids[i], i<len; i++) {
    
        var e = movie[movie_id];
        e.movie_id = movie_id;

        if (e.done) {
            total_done++;
            continue;
        }

        movies.push(e);

        /*var d = document.createElement('li');
        d.setAttribute("id","movie-" +  movie_id);



        var l = document.createElement('a');
        l.setAttribute("href", e.url );
        l.setAttribute("target", "_blank" );


        var title = unescape(e.title) + " (" + e.year + ")";
        var img = document.createElement('img');
        var txt = e.title + " | en agenda desde hace " + e.when;
        img.setAttribute('src',e.img);
        img.setAttribute('title',txt);
        img.setAttribute('alt',txt);
        img.setAttribute('height',"96px");
        img.setAttribute('width',"64px");
        l.appendChild(img);
        d.appendChild(l);
             

        if (e.torrent_url) {
            var l2 = document.createElement('a');

            l2.setAttribute("id", "d" +  movie_id);
            l2.setAttribute("class","h");

            if (config.download) {
                l2.setAttribute("href", e.torrent_url);
                l2.setAttribute("target", "_blank" );
                l2.setAttribute("onclick", "movie["+movie_id+"].done=1" );
            }
            else {
                l2.setAttribute("href", "#");
                l2.setAttribute("onclick", "download2("+ movie_id+")" );
            }

            l2.setAttribute("class", "butt2" );
            l2.innerHTML = "Bajar";
            d.appendChild(l2);
        }
        else {
            var l2 = document.createElement('div');
            l2.setAttribute("class", "nbutt2" );
            l2.innerHTML = "N / D";
            d.appendChild(l2);
        }

            var l2 = document.createElement('a');
            l2 = document.createElement('a');
            l2.setAttribute("href", "#" );
            l2.setAttribute("onclick", "hideTorrent("+ movie_id+")" );
            l2.setAttribute("class", "butt3" );
            l2.innerHTML = "Ocultar";
        d.appendChild(l2);


        movieList.appendChild(d);*/

    }
    $("#movieTemplate").tmpl(movies).appendTo("#movies");
}

function storeScheduled(scheduled) {

    movies_ids = new Array();
    for (var i in scheduled.movies) {

        var e = scheduled.movies[i];

        if ( ! movie[e.id] ) {

            movie[e.id]        = new Object;
            movie[e.id].title  = unescape(e.title);
            movie[e.id].year   = e.year;
            movie[e.id].status = "nueva";
            movie[e.id].url    = e.url;
            movie[e.id].img    = e.img;
            movie[e.id].when   = e.when;
        }

        movies_ids.push(e.id);
    }
}

function saveStorage() {
    localStorage.setItem('ckplus', JSON.stringify(movie));
}

function refreshTorrents() {

    log("buscando torrents");

    for(var i=0,len=movies_ids.length; movie_id=movies_ids[i], i<len; i++) {
        var e = movie[movie_id];

        if (e.done) continue;

//log(e.torrent_url);            
        if (! e.torrent_url && ! e.tried) {
            getTPB(movie_id, e.title,e.year);
        }

//DEBUG
//break;
    }
    log('');
}


function resetTransmission() {

    document.getElementById('movies').innerHTML = '';

    for (var i in movie) {
        var e = movie[i];
        if (e.done) continue;


        e.transmission_hash      = null;
        e.transmission_duplicate = null;
    }
    updateDisplay();
}


function updateTransmission() {

    if ( config.transmission) {
        status("Actualizando Transmission");
        for (var i in movie) {
            var e = movie[i];


            if (e.done) continue;

            if (! e.transmission_hash && ! e.transmission_duplicate) {
                addTorrent(e, 1);
            }


            log("");
        }
    }
}

function getUTokens() {

    var url = u_base_url() + 'token.html';

    $.get(url, function(data) {
        u_token = data.substr(data.indexOf("none;")+7,64); 
        for (var i in movie) {
                var e = movie[i];

                if (e.done) continue;

                if (! e.utorrent_ok ) {
                    addUTorrent(e, 1);
                }
        }

    })
    .error(function() { log("error con utorrent"); })
}


function add1_Utorrent(movie_id) {

    var url = u_base_url() + 'token.html';

    $.get(url, function(data) {
        u_token = data.substr(data.indexOf("none;")+7,64); 
        addUTorrent(movie[movie_id], 1);
    })
    .error(function() { status("error con utorrent"); })
}


function add1_Transmission(movie_id) {

    var e = movie[movie_id];

    if (! e.transmission_hash && ! e.transmission_duplicate) {
        addTorrent(e, 1);
    }
}



function updateUtorrent() {

    if ( config.utorrent) {

        status("Actualizando uTorrent");
        getUTokens();

    }
}




function getScheduled(id) {

    status("Contactando Cinemaki...");

    $.get(
        "http://www.cinemaki.com.ar/scheduled/" + id  
                + "/limit/24"
                + "/start/" + total_done ,
        function(data) {

            log("procesando Cinemaki");


            var scheduled = jQuery.parseJSON(data);

            status("Traje " + scheduled.movies.length + " pelis en tu agenda"); 

console.log(scheduled.user);
            $("#user").html(scheduled.user);

            storeScheduled(scheduled);
            updateDisplay();

            saveStorage();

            status("Buscando torrents");
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
    var t = localStorage.getItem('ckplus');

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
        $(this).children('.hide').addClass('active');
      },
      mouseleave: function () {
        $(this).children('.hide').removeClass('active');
      }
    });       
 });