function updateRadioStatus() {

    $("input[type='radio']").parent().parent().removeClass('b');

    if ($("input[name='downloadm']:checked").val() == 'transmission') {
        $("#transmission_config").slideDown();
        $("#utorrent_config").slideUp();
        $("input[name='downloadm']:checked").parent().parent().addClass("b");
    }
    else if ($("input[@name='downloadm']:checked").val() == 'utorrent') {
        $("#transmission_config").slideUp();
        $("#utorrent_config").slideDown();
        $("input[name='downloadm']:checked").parent().parent().addClass("b");
    }
    else {
        $("#transmission_config").slideUp();
        $("#utorrent_config").slideUp();
        $("input[name='downloadm']:checked").parent().parent().addClass("b");
    }

}

$( function() {
    restore_options();
    updateRadioStatus();
    $("input[name='downloadm']").change(function(){
        updateRadioStatus();
    });
});
    

// Saves options to localStorage.
function save_options() {

    var config = new Object;


    if ($("input[name='downloadm']:checked").val() == 'transmission') {
        config.transmission=true;
    } 
    else if ($("input[@name='downloadm']:checked").val() == 'utorrent') {
        config.utorrent=true;
    }
    else {
        config.download=true;
    }

    config.min_size     = parseInt( $("#min_size").val() );
    config.max_size     = parseInt( $("#max_size").val() );
    config.ck_id        = parseInt( $("#ck_id").val() );
//    config.concurrent   = parseInt( $("#concurrent").val() );
    config.transmission_host     = $("#transmission_host").val();

    config.utorrent_host         = $("#utorrent_host").val();
    config.utorrent_port         = $("#utorrent_port").val();
    config.utorrent_user         = $("#utorrent_user").val();
    config.utorrent_pass         = $("#utorrent_pass").val();

    window.localStorage.clear();
    localStorage.setItem('config', JSON.stringify(config));
    
    status("Opciones grabadas!","success");

}

// Restores select box state to saved value from localStorage.
function restore_options() {
    var t,
        config;

    // Retrieve the object from storage
    t = localStorage.getItem('config');

    config = new Object;

    if (t) {
        config = JSON.parse(t);
    }
    else  {
        config.min_size = 500;
        config.max_size = 1600;
        config.ck_id    = 12;
        config.transmission         = false;
        config.transmission_host    = '127.0.0.1';
        config.utorrent    = false;
        config.download    = true;
//            config.concurrent      = 10;
        config.utorrent_host    = '127.0.0.1';
        config.utorrent_port    = '55972';
        config.utorrent_user    = 'admin';
        config.utorrent_pass    = '';
        find_user_id();
    }

    $("#min_size").val(config.min_size);
    $("#max_size").val(config.max_size);
    $("#ck_id").val(config.ck_id);
    $("#transmission_host").val(config.transmission_host);

    $("#utorrent_host").val(config.utorrent_host);
    $("#utorrent_port").val(config.utorrent_port);
    $("#utorrent_user").val(config.utorrent_user);
    $("#utorrent_pass").val(config.utorrent_pass);


    if (config.transmission) {
        $("input[value='transmission']").attr('checked',true);
    } 
    else if (config.utorrent ) {
        $("input[value='utorrent']").attr('checked',true);
    }
    else {
        $("input[value='download']").attr('checked',true);
    }

    updateRadioStatus();

}

function find_user_id() {
    var src, user_id, user_name;

    status("Averiguando ID de CinemaKi!","info");

    $.get(
        "http://www.cinemaki.com.ar",
        function(data) {
            $('img.user50', $(data)).each( function () {
                src = $(this).attr('src');
                user_id = src.match( /([0-9])+/g )[2];
            });
            $('div#nav_bar_black_logged.fl div.r div.fl strong a b span', $(data)).each( function () {
                user_name = $(this).html();
            });

            if (is_int(user_id)) {
                $("#ck_id").val(user_id);
                $("#ck_username").val(user_name);
                save_options();
            }
        }
    );
}

function is_int(value){
  if((parseFloat(value) == parseInt(value)) && !isNaN(value)){
      return true;
  } else {
      return false;
  }
}

function status(text, type) { // info, warning, error, success
    type = typeof(type) != 'undefined' ? type : 'info';
    
    $("#status").removeClass().addClass("alert-message");

    $("#status p").html(text);
    $("#status").addClass(type).fadeIn();

    setTimeout(function() {
        $("#status").fadeOut('fast', function(){
           $("#status").removeClass(type); 
        });
    }, 4000);
}
function log(text) {
    console.log(text);
}