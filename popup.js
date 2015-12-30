document.addEventListener('DOMContentLoaded', function() {

  var url = "";
  var lastV4PublishedDate = "";
  var campaignId = "";
  var campaignDataUrl = "";
  var legacyCampaignPublishUrl = "";
  var clientJson = "";
  var campaignJson = "";
  var environment = "-lo";
  var mediaUrlBase = ""
  var clientId = "";
  var legacyCreatives = {};
  var creativeVersions = {};
  var creatives = {};
  var creativeIds= {};

  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function(tabs) {
    var tab = tabs[0];
    url = tab.url;
    if (url.indexOf(".extole.com/whitepage/") < 0)  {
      $("#publishInfo").hide();
    } else {           
      $("#noDisplay").hide();
      environment = url.substring(url.indexOf("my") + 2, url.indexOf("my") + 5);
      if (environment == ".ex") {
        environment = "";
      }
      campaignId = url.substring(url.indexOf("whitepage/") + 10, url.length);
      legacyCampaignPublishUrl = url.substring(0, url.indexOf("whitepage/")) + "campaign-config/campaigns/" + campaignId + "/publish";
      publishUrl = url.substring(0, url.indexOf("whitepage/")) + "api/v2/creatives";
      campaignDataUrl = url.substring(0, url.indexOf("whitepage/")) + "api/v2/campaigns/" + campaignId;
      loadCreativeInfo();
    }
  });

  $("#refresh").click(function() {
    renderCreativeInfo();
  });

  $("#v4_publish").click(function() {
    $("#actionStatus").text("Pending...").css('background-color', 'yellow').css('color');
    getCampaign(function getCampaignSuccess(data) {
      lastV4PublishedDate = data.published_date;
      var publishUrl = campaignDataUrl + "/publish";
      $.ajax({
        method: "POST",
        url: publishUrl,
        success: function(data) {
          if (lastV4PublishedDate < data.published_date) {
            lastV4PublishedDate = data.published_date;
            $("#actionStatus").text("Success").css('background-color', 'green').css('color', 'white');
            $("#actionStatus").fadeOut('slow', function() {
              $("#actionStatus").text("");
            })
            renderCreativeInfo();
          }
        },
        error: function(data) {
          console.log("Failure! ");
            $("#actionStatus").text("Failed");
        }
      });
    });
  });

  $("#legacy_core_publish").click(function() {
      $.ajax({
        method: "GET",
        url: legacyCampaignPublishUrl,
        success: function(data, status) {
          if (status === "success") {
            console.log("success!");
            $("#actionStatus").show();
            $("#actionStatus").text("Linking Request Sent").css("color", "green");
            $("#actionStatus").fadeOut(2000, function() {
               $("#actionStatus").text("");
            })
          } else {
            console.log("not modified!");
          }
        },
        error: function(data) {
          console.log("Failure! ");
        }
      });
  });


  $("#creative_media_publish").click(function() {
    $.each(creativeIds, function(key, value) {
      $.ajax({
        method: "POST",
        url: publishUrl + "/" + value + "/publish",
        success: function(data, status) {
          if (status === "success") {
            console.log("success!");
            $("#actionStatus").show();
            $("#actionStatus").text("Media Publish Request Sent").css("color", "green");
            $("#actionStatus").fadeOut(2000, function() {
               $("#actionStatus").text("");
            })
          } else {
            console.log("not modified!");
          }
        },
        error: function(data) {
          console.log("Failure! ");
        }
      });
    })
  });

  function renderCreativeInfo() {
    $("#creatives").fadeOut('fast', function() {   
      $("#creatives").empty();
      loadCreativeInfo();
    $("#creatives").fadeIn('fast');
    });
  };

  function loadCreativeInfo() {
    $.ajax({
      method: "GET",
      url: campaignDataUrl,
      success: function(data) {
        campaignJson = data;
        $("#campaignInfo").text("Campaign: " + campaignJson.name);
        chrome.cookies.get({url : url, name : "ex_id"}, function(cookie) {
          var cookieValue = cookie.value;
          clientId = cookieValue.substring(cookieValue.indexOf("&c") + 3, cookieValue.indexOf("&r="));
          mediaUrlBase = "http://media" + environment + ".extole.com/config/clients/" + clientId;
          $.ajax({
            method: "GET",
            url: mediaUrlBase + "/client.json",
            success: function(data) {
              clientJson = data;
              $.each(campaignJson.steps, function(index, step) {
                $.each(step.mappings, function(index, mapping) {
                  if(mapping.creative!=null) {
                    legacyCreatives[mapping.zone.name] = clientJson.campaigns[campaignId][mapping.zone.name + "_creative"];
                    creatives[mapping.zone.name] = mapping.creative.id + "-" + mapping.creative.latest_version;
                    creativeIds[mapping.zone.name] = mapping.creative.id;
                    creativeVersions[mapping.zone.name] = mapping.creative.latest_version;
                      $("#creatives").append("<div class='creative'>" + mapping.creative.name + "</div>" +
                      "<div id='" + mapping.zone.name + "_version' class='creative_version'></div>" +
                      "<div id='" + mapping.zone.name + "_media_status' class='creative_file_status'></div>" +
                      "<div id='" + mapping.zone.name + "_link_status' class='creative_link_status'></div>");
                  }
                });          
              });

              loadCreativeStatus();

            },
            error: function(data) {
              console.log("Failure! ");
            }
          });
        });
      },
      error: function(data) {
        console.log("Failure! ");
      }
    });
  };

  function getCampaign(callback) {
    $.ajax({
      method: "GET",
      url: campaignDataUrl,
      success: function(data) {
        callback(data);
      },
      error: function(data) {
        console.log("Failure fetching campaign info! ");
      }
    });
  };

  function loadCreativeStatus() {
    loadCreativeVersions();
    loadCreativeMediaStatus();
    loadCreativeLinkStatus();
  };

  function loadCreativeVersions() {
    $.each(creativeVersions, function(key, value) {
      $("#" + key + "_version").text(value);
    });
  };

  function loadCreativeMediaStatus() {
    $.each(creatives, function(key, value) {
      $.ajax({
        method: "GET",
        url: mediaUrlBase + "/" + value + "/extole/creative_inventory.json", 
        success: function(data, textStatus, response) {
          var mediaDate = new Date(response.getResponseHeader("Last-Modified"));
          var linkDateString = $("#" + key + "_link_status").text();
          if ( linkDateString != "") {
            var linkDate = new Date(linkDateString);
          }
          if (mediaDate < linkDate) {
            $("#" + key + "_link_status").css('color', 'green');
          } else {
            $("#" + key + "_link_status").css('color', 'red');
          }
          $("#" + key + "_media_status").css('color', 'green');
          $("#" + key + "_media_status").text(mediaDate.toLocaleString());
        },
        error: function(data) {
          $("#" + key + "_media_status").text("No");
          $("#" + key + "_media_status").css('color', 'red');
        }
      });
    });
  };

  function loadCreativeLinkStatus() {
    $.each(legacyCreatives, function(key, value) {
      $.ajax({
        method: "GET",
        url: mediaUrlBase + "/creative_" + value + ".js", 
        success: function(data, textStatus, response) {
          $("#" + key + "_link_status").text("PRESENT");
        },
        error: function(data) {
          if (data.status == 200) {
            if (data.responseText == "There was an error generating the content") {
              $("#" + key + "_link_status").text("N/A");       
            } else {
              var linkDate = new Date(data.getResponseHeader("Last-Modified"));
              var mediaDateString = $("#" + key + "_media_status").text();
              if ( mediaDateString != "") {
                var mediaPublishDate = new Date(mediaDateString);
              }
              if (mediaPublishDate < linkDate) {
                $("#" + key + "_link_status").css('color', 'green');
              } else {
                $("#" + key + "_link_status").css('color', 'red');
              }
              $("#" + key + "_link_status").text(linkDate.toLocaleString());
            }
          } else {
            $("#" + key + "_link_status").text("N/A");        
            $("#" + key + "_link_status").css('color', 'red');     
          }
        }
      });
    });
  };

});



