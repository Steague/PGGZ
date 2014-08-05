var GZ = (function(my, $)
{
    var storage = $.localStorage;
    var api_url = "http://dev.generationzgame.com/api/v1";

    my.localSet = function(key, value)
    {
        // log.panel("Setting key (" + key + ") to local storage. Value: " + value);

        return storage.set(key, value);
    };

    my.localGet = function(key)
    {
        // log.panel("Getting key (" + key + ") from local storage.");
        return storage.get(key);
    };

    my.localRemove = function(key)
    {
        // log.panel("Removing key (" + key + ") from local storage.");
        return storage.remove(key);
    };

    my.ajax = function(url, params, callback, method)
    {
        // log.panel("Making API AJAX call: " + url);

        if (my.localGet("signed_request") !== null)
        {
            console.log(params);
            if (params instanceof jQuery &&
                params.find("input[name=signed_request]") != "undefined")
            {
                var sr = $("<input />").attr(
                {
                    "type": "hidden",
                    "name": "signed_request",
                    "value": my.localGet("signed_request")
                });

                params.append(sr);
            }
        }

        if (params instanceof jQuery)
        {
            params = params.serializeArray();
        }

        return $.ajax(api_url + url,
        {
            "data": params,
            "type": method,
            "dataType": "json"
        }).done(function(res)
        {
            callback(res);
        }).fail(function(jqxhr, textStatus, error)
        {
            log.panel("API AJAX call failed.");

            if ("responseJSON" in jqxhr &&
                "__error" in jqxhr.responseJSON)
            {
                my.load_error(jqxhr.responseJSON["__error"]["__message"]);
                return;
            }

            my.load_error("Unknown error (2).");
        });
    };

    my.load_template = function(template, data, transition)
    {
        if (transition == "undefined")
        {
            transition = "slide";
        }

        log.panel("Loading template: " + template + ". Transition: " + transition);

        if ($("#" + template + "_template").length >= 1)
        {
            log.panel("Found template to load.");
            $("#" + template + " div[role=main]").loadTemplate($("#" + template + "_template"), data,
            {
                "success": function()
                {
                    log.panel("Template loaded, recreating mobile widgets.");
                    $("body").trigger("create");
                    $.mobile.loading("hide");
                }
            });
        }

        log.panel("Navigating to page: " + template + ".");
        $.mobile.navigate("#" + template,
        {
            "transition": transition
        });
    };

    my.load_error = function(message)
    {
        log.panel("Load error: " + message);
        my.load_template("error_message",
        {
            "message": message
        }, "pop");
    };

    my.navigate_to = function(params)
    {
        if (!("template" in params))
        {
            my.load_error("No template specified.");
            return;
        }

        if (!("data" in params))
        {
            my.load_error("No data specified.");
            return;
        }

        my.load_template(params["template"], params["data"]);
    };

    my.process_ajax = function(res)
    {
        if (!("result" in res) ||
            res["result"] != "success")
        {
            GZ.load_error("Unknown error");
            return;
        }

        if (res.hasOwnProperty("callback"))
        {
            var callback = res["callback"];

            var fn = window["GZ"][callback["function"]];
            if (typeof fn === 'function')
            {
                fn(callback["params"]);
            }
        }

        if (res.hasOwnProperty("signed_request"))
        {
            GZ.localSet("signed_request", res.signed_request);
        }
    };

    return my;
}(GZ ||
{}, jQuery));


var log = {};
log.panel = function(text)
{
    console.log(text);
    var panel = $("#console-log");

    var p = $("<p />").text(text);
    panel.append(p);
    $("#right-panel").trigger("updatelayout");
};

$(window).ready(function()
{
    $("#right-panel").panel().enhanceWithin();

    $.mobile.loading("show");

    //Logging out
    $("a[href=#login]").click(function()
    {
        GZ.localRemove("signed_request");
    });

    $(document).on("pagechange", function()
    {
        log.panel("New active page: " + $.mobile.activePage.attr("id"));
    });

    $(document).on("pageinit", $.mobile.activePage, function()
    {
        $(document).on("swipeleft", $.mobile.activePage, function(e)
        {
            // We check if there is no open panel on the page because otherwise
            // a swipe to close the left panel would also open the right panel (and v.v.).
            // We do this by checking the data that the framework stores on the page element (panel: open).
            if ($.mobile.activePage.jqmData("panel") !== "open")
            {
                if (e.type === "swipeleft")
                {
                    $("#right-panel").panel("open");
                }
            }
        });
    });

    //Check for signed request and forward to login page
    if (GZ.localGet("signed_request") !== null)
    {
        GZ.ajax("/login",
        {
            "signed_request": GZ.localGet("signed_request")
        }, GZ.process_ajax);
    }
    else
    {
        GZ.load_template("login");
    }

    $('form[method]').submit(function(e)
    {
        e.preventDefault();
        $.mobile.loading("show");

        var action = $(this).attr("action");

        GZ.ajax(action, $(this), GZ.process_ajax, $(this).attr("method"));
    });

    $.mobile.defaultPageTransition = "slide";
    $.mobile.defaultDialogTransition = "pop";

    // var help_list_object = {};
    // $("a[href=#help_panel]").click(function()
    // {
    //     var title = ucwords($(this).parent().attr("data-title").trim());
    //     var content;

    //     $('#help_panel_content').html("");

    //     if (!help_list_object.hasOwnProperty(title))
    //     {
    //         $.mobile.loading("show",
    //         {
    //             textonly: false
    //         });

    //         $.ajax(
    //         {
    //             "url": "/help/lookup",
    //             "dataType": "json",
    //             "data":
    //             {
    //                 "title": title
    //             }
    //         }).done(function(data)
    //         {
    //             populateHelp(data);

    //             help_list_object[title] = data;
    //         }).always(function()
    //         {
    //             $.mobile.loading("hide");
    //         });
    //     }
    //     else
    //     {
    //         populateHelp(help_list_object[title]);
    //     }

    //     $("#help_panel").trigger("updatelayout");
    // });

    var slider_obj = {};
    $(".new_player_slider").on("change", function(e)
    {
        if (!slider_obj.hasOwnProperty($(this).attr("id")) ||
            slider_obj[$(this).attr("id")] != $(this).val())
        {
            var change = $(this).val() - slider_obj[$(this).attr("id")];
            slider_obj[$(this).attr("id")] = $(this).val();
            var pr = parseInt($("#points_remaining").val(), 10);

            if (!isNaN(change))
            {
                $("#points_remaining").val(pr - change).slider("refresh");

                var myId = $(this).attr("id");
                $.each($(".new_player_slider"), function(k, v)
                {
                    if ($(v).attr("id") != myId)
                    {
                        var pr = parseInt($("#points_remaining").val(), 10);
                        var new_max = parseInt($(v).val(), 10) + pr;
                        $(v).attr("max", new_max).slider("refresh");
                    }
                });
            }
        }
    });
});

function populateHelp(data)
{
    $('#help_panel_content').html("");
    var h3 = $("<h3 />").text(data.title);
    var p = $("<p />").text(data.content);
    $('#help_panel_content').html(h3);
    $('#help_panel_content').append(p);
}

function ucwords(str)
{
    return (str + '')
        .replace(/^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g, function($1)
        {
            return $1.toUpperCase();
        });
}