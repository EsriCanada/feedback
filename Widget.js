define(
  [

    "jimu/PanelManager",
    "jimu/BaseWidget",
    "jimu/WidgetManager",
    "jimu/portalUtils",
    "jimu/dijit/CheckBox",
    "jimu/tokenUtils",
    "dojo/_base/html",
    "dojo/_base/array",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/aspect",
    "dojo/Deferred",
    "dojo/dom",
    "dojo/on",
    "dojo/dom-style",
    "dojo/query",
    "dojo/dom-construct",
    "dijit/registry",
    "dijit/_WidgetsInTemplateMixin",
    "esri/request",
    "esri/dijit/editing/Editor",
    "esri/dijit/editing/TemplatePicker",
    "esri/dijit/PopupTemplate",
    "esri/layers/FeatureLayer",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/tasks/PrintTask",
    "esri/tasks/PrintParameters",
    "esri/tasks/PrintTemplate",

    "dojox/gfx",
    "dojox/mobile/TextArea",
    "dijit/Dialog",
    "dijit/layout/ContentPane",
    "dijit/form/Button",
    "dijit/form/HorizontalSlider"

  ], function(

    PanelManager,
    BaseWidget,
    WidgetManager,
    portalUtils,
    CheckBox,
    tokenUtils,
    html,
    array,
    declare,
    lang,
    aspect,
    Deferred,
    dom,
    on,
    domStyle,
    $,
    domConstruct,
    registry,
    _WidgetsInTemplateMixin,
    esriRequest,
    Editor,
    TemplatePicker,
    PopupTemplate,
    FeatureLayer,
    Query,
    QueryTask,
    PrintTask,
    PrintParameters,
    PrintTemplate,

    Gfx,
    mTextArea,
    Dialog,
    ContentPane,
    Button,
    HorizontalSlider

  ) {

    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget, _WidgetsInTemplateMixin], {

      // DemoWidget code goes here

      //please note that this property is be set by the framework when widget is loaded.
      //templateString: template,

      baseClass: 'jimu-widget-gfx',

      name: 'GFX',

      inviteId: null,
      credential: null,
      editor: null,
      layers: [],
      templateStyle: null,
      attributeInspectorIsHydrated: false,
      agolUser: null,

      postCreate: function() {

        this.inherited(arguments);
        console.log('postCreate');
        // cam's changes
        //console.log(this.appConfig.httpProxy);
        $(this.logoNode).attr('src', this.folderUrl + 'images/CommunityMapsLogo.png');

        this.map.infoWindow.on("show", lang.hitch(this, function() {
          console.log('show');
          if (!tokenUtils.userHaveSignIn()) {
            return;
          }
          if (this.attributeInspectorIsHydrated === false) {
            this.editor.attributeInspector.on("next", lang.hitch(this, function(evt) {
              console.log(evt);
              this.dealWithSelectedFeature();
            }));
            this.attributeInspectorIsHydrated = true;
          }
          this.dealWithSelectedFeature();
        }));

        this.map.infoWindow.on("hide", lang.hitch(this, function() {
          console.log('hide');
          dom.byId("conversationDiv").innerHTML = "";
          domStyle.set(dom.byId("submitConversation"), "display", "none");
        }));

      },

      findIntersectingCommunities: function(graphic, config) {

        this.initialize(config);
        var query = new Query();
        query.geometry = graphic._feedbackGraphic.geometry;
        query.inSR = '';
        query.outSR = '';
        query.outFields = [this.config.contributorBoundariesFields.data_source, this.config.contributorBoundariesFields.alias];
        var queryTask = new QueryTask(URL.toFullURL(this.config.contributorBoundaries));
        t = this;
        var assignmentCommunities = [];

        //var loadingIndicator = new mProgress({ size: 12, center: false, startSpinning: true });
        //domStyle.set(loadingIndicator.domNode, { "display": "inline-block" });
        //dojo.byId("_reassignDiv").appendChild(loadingIndicator.domNode);

        queryTask.execute(query, function(featureSet) {
          if (featureSet.features.length > 1) {
            for (var community in featureSet.features) {
              if (featureSet.features[community].attributes[t.config.contributorBoundariesFields.data_source] != graphic.attributes.mgmt_data_source) {
                assignmentCommunities.push({
                  "name": "community"
                });
              }
            }
            var onChange = function(data) {
              //console.log(data);
            }
            SelectBox.createSelectBox(config, "reassignFeedback", assignmentCommunities, "Choose new community", onChange);
          } else {
            dojo.byId("reassignFeedback").value = "No intersecting communitites";
          }
          loadingIndicator.stop();
        }, function(data) {
          console.log(data)
        });

      },


      dealWithSelectedFeature: function() {

        //return;
        //hide the 'globalid' field in the attribute inspector
        domStyle.set($('.atiAttributes').children().children().children()[4], "display", "none");
        var atiButtonsDiv = $(".atiButtons")[0];
        var buttonsDiv = domConstruct.create("div", {
          "class": "buttonsDiv"
        }, atiButtonsDiv);
        var commentDiv = domConstruct.create("div", {
          "class": "commentDiv"
        }, atiButtonsDiv);
        if (this.agolUser.isAdmin == 1) {
          this.showFeedbackButtons(buttonsDiv);
        }
        //this.map.centerAt(this.editor.attributeInspector._currentFeature.geometry);
        //console.log(registry.findWidgets(this.editor.attributeInspector.attributeTable)[1].displayedValue);
        if (registry.findWidgets(this.editor.attributeInspector.attributeTable)[1].displayedValue === "") {
          registry.findWidgets(this.editor.attributeInspector.attributeTable)[1].set("displayedValue", "New Observation");
          this.queryContributor(this.map.infoWindow._location).then(lang.hitch(this, function(result) {
            var contributorId = result.features[0].attributes["gfx_management.sde.DataSource.id"];
            var commonName = result.features[0].attributes["gfx_management.sde.DataSource.name_common"];
            registry.findWidgets(this.editor.attributeInspector.attributeTable)[0].set("displayedValue", contributorId);
          }));
        } else {
          console.log('queryConversation');
          this.queryConversation(); //this.editor.attributeInspector._currentFeature);
        }

      },

      startup: function() {

        this.inherited(arguments);
        this.widgetManager = WidgetManager.getInstance();
        this.panelManager = PanelManager.getInstance();

        if (this.map.layerIds.length < 2) {
          var url = "http://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer";
          this.imagery = new esri.layers.ArcGISTiledMapServiceLayer(url, {
            opacity: 0,
            visible: true
          });
          this.map.addLayer(this.imagery, 1);
        }

        //this.mapIdNode.innerHTML = 'map id:' + this.map.id;
        console.log('startup');

      },

      onOpen: function() {

        console.log('onOpen');

        if (tokenUtils.userHaveSignIn()) {
          console.log('yay');
          //this.onSignIn(tokenUtils.getCredential());
        } else {
          //this.onSignOut();
          console.log('nay');
          tokenUtils.signIn(this.appConfig.portalUrl, this.appConfig.appId);
        }

        if (this.layers.length > 0) {
          this.toggleFeedbackLayersVisibility(true);
        }

      },

      onClose: function() {

        console.log('onClose');
        this.toggleFeedbackLayersVisibility(false);
        if (this.attributeTable) {
          this.widgetManager.closeWidget(this.attributeTable);

        }

      },

      onMinimize: function() {

        console.log('onMinimize');

      },

      onMaximize: function() {

        console.log('onMaximize');

      },

      onSignIn: function(credential) {

        /* jshint unused:false*/
        console.log('onSignIn');
        console.log(credential);
        //domStyle.set("logoPanel", "display", "none");
        this.credential = credential;
        this.engageFeedback(credential);

      },

      onSignOut: function() {

        console.log('onSignOut');
        conversationDiv.innerHTML = "";
        domStyle.set("logoPanel", "display", "block");
        domStyle.set(dom.byId("groupInvitePanel"), "display", "none");
        domStyle.set(dom.byId("editorDiv"), "display", "none");
        domStyle.set(dom.byId("submitConversation"), "display", "none");
        domStyle.set(dom.byId("viewAllFeedback"), "display", "none");
        domStyle.set(dom.byId("toggleAttribute"), "display", "none");
        domStyle.set(dom.byId("imageryControl"), "display", "none");

        //console.log(this.layers);

        if (this.layers.length > 0) {
          this.toggleFeedbackLayersVisibility(false);
        }

      },

      acceptInvite: function() {

        console.log(this.inviteId);
        console.log(this.credential);
        /*
      var engageFeedbackHandle = esriRequest({
                url: this.config.feedbackUrl + "/EngageFeedback?username=" + credential.userId + "&access_token=" + credential.token,
                handleAs: "json"
        });*/

        var acceptInvitationHandle = esriRequest({
          url: this.config.feedbackUrl + "/AcceptInvite?username=" + this.credential.userId + "&inviteId=" + this.inviteId + "&access_token=" + this.credential.token,
          handleAs: "json"
        });

        acceptInvitationHandle.then(lang.hitch(this, this.acceptInvitationSucceeded), lang.hitch(this, this.acceptInvitationFailed));

      },

      acceptInvitationSucceeded: function(response, io) {

        console.log(response);
        // domStyle.set("logoPanel", "display", "none");
        domStyle.set(dom.byId("groupInvitePanel"), "display", "none");
        this.engageEditing();

      },

      acceptInvitationFailed: function(response, io) {

        console.log(response);

      },

      declineInvite: function() {

        var declineInvitationHandle = esriRequest({
          url: "http://www.arcgis.com/sharing/rest/community/users/" + this.credential.userId + "/invitations/" + this.inviteId + "/decline",
          content: {
            token: this.credential.token,
            f: "json"
          },
          handleAs: "json"
        }, {
          usePost: true
        });

        declineInvitationHandle.then(lang.hitch(this, this.declineInvitationSucceeded), lang.hitch(this, this.declineInvitationFailed));

      },

      declineInvitationSucceeded: function(response, io) {

        dom.byId("userMessage").innerHTML = this.nls.gfxGroupDecline;
        domStyle.set("logoPanel", "display", "block");
        domStyle.set(dom.byId("acceptInvite"), "display", "none");
        domStyle.set(dom.byId("declineInvite"), "display", "none");
        //WidgetManager.getInstance().closeWidget("GFX");
        //PanelManager.getInstance().closePanel(PanelManager.getInstance().closePanel(PanelManager.getInstance().panels[0]));
        //console.log(this.widgetManager);

        //this.onClose();

      },

      declineInvitationFailed: function(response, io) {

        console.log(response);

      },

      toggleAllFeedback: function() {

      },

      submitConversation: function() {

      },

      engageFeedback: function(credential) {

        var engageFeedbackHandle = esriRequest({
          url: this.config.feedbackUrl + "/EngageFeedback?username=" + credential.userId + "&access_token=" + credential.token,
          handleAs: "json"
        });
        engageFeedbackHandle.then(lang.hitch(this, this.engageFeedbackHandleSucceeded), lang.hitch(this, this.engageFeedbackHandleFailed));

      },

      engageFeedbackHandleSucceeded: function(response, io) {

        this.agolUser = response;
        console.log(this.agolUser);

        if (response.isAuthenticated === true && response.isMember) {
          if (response.isMember === true) {
            domStyle.set("groupInvitePanel", "display", "none");
            // domStyle.set("logoPanel", "display", "none");
            //window.opener.OAuthHelper.checkOAuthResponse(window.location.href);
            //Add Editor widget
            console.log(this.editor);
            if (this.editor === null || this.editor === undefined) {
              this.engageEditing();
            } else {
              domStyle.set(dom.byId("viewAllFeedback"), "display", "block");
              domStyle.set(dom.byId("toggleAttribute"), "display", "block");
              domStyle.set(dom.byId("imageryControl"), "display", "block");

              domStyle.set(dom.byId("editorDiv"), "display", "block");
              this.toggleFeedbackLayersVisibility(true);
            }
          }
        } else if (response.isAuthenticated === true && response.userInvitation) {

          domStyle.set("logoPanel", "display", "block");

          this.inviteId = response.userInvitation.id;

          domStyle.set("groupInvitePanel", "display", "block");
          dom.byId("userId").innerHTML = this.credential.userId + " (" + response.email + ")";
          dom.byId("userMessage").innerHTML = this.nls.gfxGroupInvite;
          domStyle.set(dom.byId("acceptInvite"), "display", "inline");
          domStyle.set(dom.byId("declineInvite"), "display", "inline");

          //on(dom.byId("acceptInvite"), "click", this.acceptInvite);
          //on(dom.byId("declineInvite"), "click", this.declineInvite);

          console.log(this.inviteId);
        }

      },
      engageFeedbackHandleFailed: function(response, io) {

        console.log(response);

      },

      engageEditing: function() {

        //console.log('engage');
        //console.log(this.config);
        /*
      if (!this.config.editor.layerInfos || this.config.editor.layerInfos.length === 0) {
          return;
        }
        var len = this.config.editor.layerInfos.length;
        var layerInfos = this.config.editor.layerInfos;
        */


        if (!this.agolUser.layerInfos || this.agolUser.layerInfos.length === 0) {
          return;
        }
        var len = this.agolUser.layerInfos.length;
        var layerInfos = this.agolUser.layerInfos;


        for (var i = 0; i < len; i++) {
          var featureLayer = layerInfos[i].featureLayer;
          var layer = this.getLayerFromMap(featureLayer.url);
          if (!layer) {
            if (!layerInfos[i].featureLayer.options) {
              layerInfos[i].featureLayer.options = {};
            }
            if (!layerInfos[i].featureLayer.options.outFields) {
              if (layerInfos[i].fieldInfos) {
                layerInfos[i].featureLayer.options.outFields = [];
                for (var j = 0; j < layerInfos[i].fieldInfos.length; j++) {
                  layerInfos[i].featureLayer.options.outFields.push(layerInfos[i].fieldInfos[j].fieldName);
                }
              } else {
                layerInfos[i].featureLayer.options.outFields = ["*"];
              }

            }
            layer = new FeatureLayer(featureLayer.url, featureLayer.options);
            console.log(layer);
            console.log(this.credential);
            layer.on("edits-complete", lang.hitch(this, this.editsCompleteHandler));
            //layer.on("graphic-add", lang.hitch(this,this.graphicAddHandler));
            layer.setDefinitionExpression("Creator = '" + this.credential.userId + "'");
            this.map.addLayer(layer);
          }
          if (layer.visible) {
            layerInfos[i].featureLayer = layer;
            this.layers.push(layerInfos[i]);
          }
        }
        this.initEditor();

      },

      editsCompleteHandler: function(result) {

        //console.log(this.credential);
        console.log(result);

        if (result.adds.length > 0) {
          console.log("OID: " + result.adds[0].objectId);
          console.log("Scale: " + this.map.getScale());
          this.createAndAttachReport(result.adds[0].objectId, "point");

        }

      },

      createAndAttachReport: function(objectid, featureType) {

        var printTask = new PrintTask("http://74.216.225.66/arcgis/rest/services/observation/GPServer/Observe", {
          async: true
        });
        var template = new PrintTemplate();
        template.exportOptions = {
          width: 500,
          height: 400,
          dpi: 96
        };
        template.format = "PDF";
        template.layout = "Feedback_Simple";
        template.preserveScale = false;

        var layoutOptions = {
          'copyrightText': "copyrightText",
          'authorText': 'authorText',
          'titleText': 'titleText'
        };

        var params = new PrintParameters();

        params.map = this.map;

        params.template = template;

        params.extraParameters = {
          observation: objectid, //fill In - objectid of feature,
          obsScale: Math.round(this.map.getScale()), //fill In (e.g. 10000),
          featuretype: featureType, //fill In - (either "point", "polyline" or "polygon"),
          testMode: 0,
          email: this.agolUser.email
        };
        console.log(printTask);
        aspect.after(printTask, 'onComplete', lang.hitch(this, this.printSuccessful), true);
        //aspect.after(printTask, 'onError', lang.hitch(this, this.submitError),true);
        printTask.execute(params);

      },

      printSuccessful: function(response) {

        console.log(response);
      },

      getLayerFromMap: function(url) {

        var ids = this.map.graphicsLayerIds;
        var len = ids.length;
        for (var i = 0; i < len; i++) {
          var layer = this.map.getLayer(ids[i]);
          if (layer.url === url) {
            return layer;
          }
        }
        return null;

      },

      initEditor: function() {

        var json = this.config.editor;
        console.log(json);
        var settings = {};

        for (var attr in json) {
          settings[attr] = json[attr];
        }

        settings.layerInfos = this.agolUser.layerInfos;


        settings.map = this.map;
        settings.toolbarVisible = false;
        //mySettings = settings;

        console.log(settings);

        var layers = [];

        //console.log(settings.layerInfos);
        array.forEach(settings.layerInfos, lang.hitch(this, function(layerInfo, index) {
          layers.push(layerInfo.featureLayer);
        }));


        // console.log(layers);

        //settings.templatePicker = new TemplatePicker({featureLayers:layers,rows:"auto"});
        var params = {
          settings: settings
        };
        // console.log(params);
        //params = null;
        var height = domStyle.get(this.editDiv, "height");
        console.log(height);

        this.templateStyle = document.createElement('style');
        // this.templateStyle.innerHTML = ".jimu-widget-gfx .grid{ height: 350px;}";
        this.templateStyle.innerHTML = ".jimu-widget-gfx .grid{ height: " + (height - 125) + "px;}";
        document.body.appendChild(this.templateStyle);

        this.editor = new Editor(params, this.editDiv);

        this.editor.startup();
        //this.editor.templatePicker.attr("rows", 1);
        myEditor = this.editor;

        domStyle.set(dom.byId("viewAllFeedback"), "display", "block");
        domStyle.set(dom.byId("toggleAttribute"), "display", "block");
        domStyle.set(dom.byId("imageryControl"), "display", "block");

        var t = this;
        var slider = new HorizontalSlider({
          name: "slider",
          value: 0,
          minimum: 0,
          maximum: 1,
          intermediateChanges: true,
          style: "width:125px;",
          onChange: function(value) {
            t.changeOpacity(value);
          }
        }, "imagerySlider").startup();

        /*
        console.log(this.editor.attributeInspector);

        this.editor.attributeInspector.on("next", lang.hitch(this, function(evt) {
          console.log(evt);

        }));*/
        //console.log(this.editor);

      },


      changeOpacity: function(op) {

        if (op == 0) {
          this.imagery.visible = false;
          this.imagery.setOpacity(0);
          return;
        } else {
          this.imagery.visible = true;
          this.imagery.setOpacity(op);
        }

      },

      destroyEditor: function() {

        if (this.editor !== null) {
          this.editor.destroy();
          this.layers.length = 0;
          this.editor = null;
          this.editDiv = domConstruct.create("div", {
            style: {
              width: "100%",
              height: "100%"
            }
          });
          domConstruct.place(this.editDiv, this.domNode);
        }

      },

      toggleAllFeedback: function() {

        //console.log(this.agreeChkNode.checked);
        //console.log(this.layers);

        var a = array.some(this.layers, lang.hitch(this, function(layer) {
          if (this.agreeChkNode.checked) {
            layer.featureLayer.setDefinitionExpression("1=1");
          } else {
            layer.featureLayer.setDefinitionExpression("Creator = '" + this.credential.userId + "'");
          }

        }));

      },



      toggleAttribute: function() {

        if (this.ChkNode1.checked) {
          if (this.attributeTable) {
            this.widgetManager.openWidget(this.attributeTable);
          } else {
            var widgetConfig = {
              id: "attribute",
              uri: "widgets/AttributeTable/Widget",
              label: "attr"
            };
            this.widgetManager.loadWidget(widgetConfig).then(lang.hitch(this, function(widget) {
              this.attributeTable = widget;

              var layers = [{
                "name": this.agolUser.layerInfos[0].featureLayer.name,
                "layer": {
                  "url": this.agolUser.layerInfos[0].featureLayer.url
                }
              }, {
                "name": this.agolUser.layerInfos[1].featureLayer.name,
                "layer": {
                  "url": this.agolUser.layerInfos[1].featureLayer.url
                }
              }, {
                "name": this.agolUser.layerInfos[2].featureLayer.name,
                "layer": {
                  "url": this.agolUser.layerInfos[2].featureLayer.url
                }
              }];


              widget.config.layers = layers;

              html.place(widget.domNode, jimuConfig.mainPageId);
              widget.startup();
            }));
          }
        } else {
          this.widgetManager.closeWidget(this.attributeTable);
        }

      },


      toggleImagery: function() {

        //console.log(this.agreeChkNode.checked);
        //console.log(this.layers);

        if (this.ChkNode2.checked) {
          this.imagery.show();
        } else {
          this.imagery.hide();
        }


      },


      queryConversation: function() { //feature

        console.log(this.editor.attributeInspector._currentFeature.attributes["globalid"]);
        var oid = this.editor.attributeInspector._currentFeature.attributes["globalid"];
        var featureLayer = new FeatureLayer(this.agolUser.conversationUrl);
        //var featureLayer = new FeatureLayer(this.config.conversationUrl);

        //console.log(feature.attributes[feature.getLayer().objectIdField]);
        //var where = "obs_guid= '5888c59b-f8db-4667-9d94-cabd599339ff'";
        var where = "obs_guid = '" + oid + "'";

        var query = new Query();
        query.where = where;

        var field = "globalid";
        var fields = ["*"];
        var queryTask = new QueryTask(featureLayer.url);
        query.returnGeometry = false;
        query.outFields = fields;
        queryTask.execute(query).then(lang.hitch(this, function(result) {
          //console.log(result);
          var conversationDiv = dom.byId("conversationDiv");
          var content = [];
          content.push("<b>Conversation:</b><br/>");
          array.forEach(result.features, lang.hitch(this, function(feature, index) {
            console.log(feature.attributes);
            content.push("<br/>");
            content.push("<fieldset>");
            content.push("<legend><b>" + feature.attributes["Creator"] + "</b></legend>");

            var d = new Date(feature.attributes["CreationDate"]);
            content.push("<i>" + d + "</i>");
            content.push("<br/><br/>");
            content.push(feature.attributes["comments"]);
            content.push("</fieldset>");
          }));

          content.push("<br/><textarea id='converse' type='text' style='width:100%'></textarea>");
          //content.push("<br/><button id='submitConversation' data-dojo-type='dijit/form/Button'>Submit</button>");

          conversationDiv.innerHTML = content.join("");

          domStyle.set(dom.byId("submitConversation"), "display", "inline");

          //console.log(result.features[0].attributes[field]);
        }));

      },

      submitConversation: function() {

        //console.log(dom.byId('converse').value);
        var comments = dom.byId('converse').value;
        var obs_guid = this.editor.attributeInspector._currentFeature.attributes["globalid"];

        //var featureLayer = new FeatureLayer(this.config.conversationUrl);
        var featureLayer = new FeatureLayer(this.agolUser.conversationUrl);

        var conversationRecord = {
          attributes: {
            obs_guid: obs_guid,
            comments: comments
          }
        };

        featureLayer.applyEdits([conversationRecord], null, null).then(lang.hitch(this, function(result) {
          console.log(result);
          this.queryConversation();
        }));

      },

      queryContributor: function(point) {

        var deferred = new Deferred();

        //console.log(point);
        var mapScale = this.map.getScale();
        var where = "(scale_small IS Null OR scale_small >= " + mapScale + ") AND (scale_large IS Null OR scale_large <= " + mapScale + ")";

        var query = new Query();
        query.where = where;
        query.geometry = point;
        //var fields = ["*"];
        var fields = this.agolUser.contributorFields;
        //var fields = this.config.contributorFields;
        //gfx_management.sde.DataSource.id,gfx_management.sde.DataSource.name_common,gfx_management.sde.DataSource.x_min,gfx_management.sde.DataSource.x_max,gfx_management.sde.DataSource.y_min,gfx_management.sde.DataSource.y_max,gfx_management.sde.Default_MGMT.priority

        //var url = "http://gfx.esri.ca/arcgis/rest/services/Communities/Contributors/MapServer/0";
        //var url = this.config.contributorUrl;
        var url = this.agolUser.contributorUrl;
        var queryTask = new QueryTask(url);
        query.returnGeometry = false;
        query.outFields = fields;
        queryTask.execute(query, lang.hitch(this, function(results) {
          this.queryTaskSucceeded(results, deferred);
        }), lang.hitch(this, this.queryTaskFailed));

        //deferred.resolve(queryTask);

        return deferred.promise;

      },

      queryTaskSucceeded: function(results, deferred) {

        //console.log(results);
        deferred.resolve(results);

      },

      queryTaskFailed: function(error) {

        console.log(error);

      },

      toggleFeedbackLayersVisibility: function(visible) {

        array.forEach(this.layers, lang.hitch(this, function(item, index) {
          item.featureLayer.setVisibility(visible);
        }));

      },

      showFeedbackButtons: function(buttonsDiv) {

        domStyle.set($(".contentPane")[0], "max-height", "700px");
        var feedbackButtons = this.config.FeedbackWorkflow[this.editor.attributeInspector._currentFeature.attributes.feedback_status];
        console.log(this.editor.attributeInspector._currentFeature.attributes.feedback_status);
        // Add appropriate buttons to infoWindow
        array.forEach(feedbackButtons, lang.hitch(this, function(entry, i) {
          var feedbackButton = domConstruct.create("div", {
            "class": "feedbackStatusButton mblButton",
            "id": "changeStatus_" + entry
          }, buttonsDiv);

          var feedbackImg = domConstruct.create("div", {
            "class": "statusImg"
          }, feedbackButton);

          var feedbackText = domConstruct.create("div", {
            "class": "statusText",
            "innerHTML": "<p>" + this.nls.FeedbackButtonStates[entry] + "</p>"
          }, feedbackButton);

          var surface = Gfx.createSurface(feedbackImg, 30, 30);
          var path = surface.createPath({
            path: this.config.buttons[entry].path
          });
          path.setFill(this.config.buttons[entry].colour);
          path.setStroke(this.config.buttons[entry].colour);
          path.applyTransform(Gfx.matrix.scale(0.6));
        }));

        var oc = $(".feedbackStatusButton", buttonsDiv).on('click', lang.hitch(this, function(btn) {
          console.log(btn.currentTarget.innerHTML);
          var splitTest = btn.currentTarget.id.split("changeStatus_");
          if (splitTest.length > 1) {
            var status = splitTest[1];
            this.feedbackComment(status, buttonsDiv);
            // this.changeFeedback(status);
          }
        }));
        // Destroy buttons on close
        var od = this.map.infoWindow.on("hide", function() {
          oc.remove();
          od.remove();
          $(".feedbackStatusButton", buttonsDiv).forEach(domConstruct.destroy);
          if (registry.byId('commentPane')) {
            registry.byId('commentPane').destroyRecursive();
          }
        });

      },

      feedbackComment: function(status, buttonsDiv) {

        if (!registry.byId("commentPane")) {

          domStyle.set(buttonsDiv, 'display', 'none');
          new ContentPane({
            "class": "commentPane",
            "id": "commentPane"
          }, $(".commentDiv")[0]);
          domConstruct.create("label", {
              "for": "fbComment",
              "innerHTML": this.nls.feedbackComment
          }, registry.byId("commentPane").domNode);
          domConstruct.create("br", null, registry.byId("commentPane").domNode);
          new mTextArea({
            "id": "fbComment",
            "rows": 3,
            "cols": 27
          });
          registry.byId("commentPane").addChild(registry.byId("fbComment"));
          domConstruct.create("br", null, registry.byId("commentPane").domNode);

          var commentButtons = domConstruct.create("div", {
            "class": "commentButtons",
            "id": "commentButtons"
          }, registry.byId("commentPane").domNode);

          var commentOK = domConstruct.create("div", {
            "class": "jimu-btn commentButton",
            "id": "commentOK",
            "innerHTML": this.nls.commentOK
          }, commentButtons);

          var commentCancel = domConstruct.create("div", {
            "class": "jimu-btn commentButton",
            "id": "commentCancel",
            "innerHTML": this.nls.commentCancel
          }, commentButtons);

          registry.byId("fbComment").focus();

          var ook = on(commentOK, 'click', lang.hitch(this, function() {
            ook.remove();
            var comment;
            if (registry.byId("fbComment").value && registry.byId("fbComment").value.length > 0) {
              comment = registry.byId("fbComment").value;
            } else {
              comment = "";
            }
            this.changeFeedback(status, comment);
          }));

          var ocan = on(commentCancel, 'click', lang.hitch(this, function() {
            // ocan.remove();
            domStyle.set($(".commentDiv")[0], 'display', 'none');
            domStyle.set(buttonsDiv, 'display', 'block');
          }));

        } else {

            domStyle.set(buttonsDiv, 'display', 'none');
            domStyle.set($(".commentDiv")[0], 'display', 'block');
            registry.byId("fbComment").reset();
            registry.byId("fbComment").focus();

        }


      },

      changeFeedback: function(status, comment) {

        var curFeature = this.editor.attributeInspector._currentFeature;
        var changeURL = this.config.feedbackUrl + "/ChangeFeedback?username=" + this.credential.userId + "&access_token=" + this.credential.token + "&obstype=Observation" + curFeature.geometry.type + "&obsid=" + curFeature.attributes.objectid + "&status=" + status;
        var changeRequest = esriRequest({
          url: changeURL,
          handleAs: "json"
        });
        changeRequest.then(lang.hitch(this, this.changeFeedbackSuccess), lang.hitch(this, this.changeFeedbackFailure)).then(lang.hitch(this, function() {
          this.map.infoWindow.hide();
        }));

      },

      changeFeedbackSuccess: function(response) {

        this.map.getLayer("graphicsLayer2").clearSelection();
        this.map.getLayer("graphicsLayer2").refresh();
        console.log(response);
        console.log('success');
        var title = "Feedback status submitted";
        var message = "Feedback status submitted.";
        // if (!registry.byId("feedbackStatusDialog")) {
        //      this.createSimpleDialog("feedbackStatus", message, title);
        //    } else {
        //      registry.byId("feedbackStatusDialog").set("content", message);
        //    }
        //    registry.byId("feedbackStatusDialog").show();

      },

      changeFeedbackFailure: function(response) {

        console.log(response);

      },

      createSimpleDialog: function(name, content, title) {

        new Dialog({
          "id": name + "Dialog",
          "title": title
        });

        new ContentPane({
          "id": name + "Pane",
          "class": "simplePane",
          "content": content
        });

        new ContentPane({
          "id": name + "Buttons",
          "class": "buttons"
        });

        new Button({
          "id": name + "OK",
          "label": "OK"
        });

        domStyle.set(registry.byId(name + "OK").domNode, "width", "60px");
        domStyle.set(registry.byId(name + "OK").domNode.firstChild, "display", "block");
        registry.byId(name + "Buttons").addChild(registry.byId(name + "OK"));
        registry.byId(name + "Dialog").addChild(registry.byId(name + "Pane"));
        registry.byId(name + "Dialog").addChild(registry.byId(name + "Buttons"));

        on(registry.byId(name + "OK"), "click", function() {
          registry.byId(name + "Dialog").hide();
        });
        registry.byId(name + "Dialog").startup();

      }

    });
  }
);
