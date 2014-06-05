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
    "esri/InfoTemplate",
    "esri/dijit/editing/Editor",
    "esri/dijit/editing/TemplatePicker",
    "esri/dijit/PopupTemplate",
    "esri/dijit/Popup",
    "esri/layers/FeatureLayer",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/tasks/PrintTask",
    "esri/tasks/PrintParameters",
    "esri/tasks/PrintTemplate",
    "esri/dijit/Legend",
    "dojox/gfx",
    "dojox/lang/functional",
    "dojox/mobile/TextArea",
    "dijit/Dialog",
    "dijit/layout/ContentPane",
    "dijit/form/Button",
    "dijit/form/HorizontalSlider",
    "dijit/form/ComboBox",
    "dojox/mobile/ComboBox",
    "dojo/data/ItemFileReadStore",
    "dojo/store/Memory",
    "esri/geometry/Extent",
    "esri/SpatialReference"

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
    InfoTemplate,
    Editor,
    TemplatePicker,
    PopupTemplate,
    Popup,
    FeatureLayer,
    ArcGISTiledMapServiceLayer,
    Query,
    QueryTask,
    PrintTask,
    PrintParameters,
    PrintTemplate,
    Legend,
    Gfx,
    functional,
    mTextArea,
    Dialog,
    ContentPane,
    Button,
    HorizontalSlider,
    ComboBoxDesktop,
    ComboBox,
    ItemFileReadStore,
    Memory,
    Extent,
    SpatialReference

  ) {

    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget, _WidgetsInTemplateMixin], {

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

        // Changes
        // var popup = new Popup(null, domConstruct.create("div"));
        // this.map.setInfoWindow(popup);

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
              // this.createInfoTemplate(curFeature).then(lang.hitch(this, function(template) {
              // curFeature.setInfoTemplate(template);
              this.dealWithSelectedFeature();
              // }));
            }));
            this.attributeInspectorIsHydrated = true;
          }
          // this.createInfoTemplate().then(lang.hitch(this, function(template) {
          //   array.forEach(this.agolUser.layerInfos, function(layerInfo) {
          //     var l = this.getLayerFromMap(layerInfo.featureLayer.url);
          //     l.setInfoTemplate(template);
          //   }, this);
          // }));
          // this.createInfoTemplate(curFeature).then(lang.hitch(this, function(template) {
          // curFeature.setInfoTemplate(template);
          // #### DOESN'T WORK... CLEARS THE ATTRIBUTE INSPECTOR curFeature ####
          // this.map.infoWindow.resize(querySettings.popupSize.w, querySettings.popupSize.h);
          this.dealWithSelectedFeature();
          // }));
          // this.dealWithSelectedFeature();
        }));

        this.map.infoWindow.on("hide", lang.hitch(this, function() {
          console.log('hide');
          dom.byId("commentDiv").innerHTML = "";
          dom.byId("attachmentDiv").innerHTML = "";
          // domStyle.set(dom.byId("submitConversation"), "display", "none");
        }));
        // Resize infoWindow
        // this.map.infoWindow.resize(300, 700);

      },

      findIntersectingCommunities: function(graphic) {

        var query = new Query();
        query.geometry = graphic.geometry;
        query.inSR = '';
        query.outSR = '';
        query.outFields = ["gfx_management.sde.DataSource.name_official"];
        var queryTask = new QueryTask("http://gfx.esri.ca/arcgis/rest/services/Communities/Contributors/MapServer/0");
        var t = this;
        var assignmentCommunities = [];

        //var loadingIndicator = new mProgress({ size: 12, center: false, startSpinning: true });
        //domStyle.set(loadingIndicator.domNode, { "display": "inline-block" });
        //dojo.byId("_reassignDiv").appendChild(loadingIndicator.domNode);

        var _this = this;

        queryTask.execute(query, function(featureSet) {
          if (featureSet.features.length > 1) {
            for (var community in featureSet.features) {
              if (featureSet.features[community].attributes["gfx_management.sde.DataSource.name_official"] !== graphic.attributes.mgmt_data_source) {
                assignmentCommunities.push({
                  "name": featureSet.features[community].attributes["gfx_management.sde.DataSource.name_official"]
                });
              }
            }

            // var onChange = function(data) {
            //   //console.log(data);
            // };

            var placeholder = "Choose new community";
            if (assignmentCommunities.length === 0) {
              placeholder = "No intersecting communities";
            }

            _this.createSelectBox(false, "intersectingCommunity", assignmentCommunities, placeholder, _this.communityChosen);
          } else {

            dom.byId("reassignFeedback").value = "No intersecting communitites";

            dom.byId("intersectingCommunity").value = "No communitites";

          }
          //loadingIndicator.stop();
        }, function(data) {
          console.log(data);
        });

      },

      communityChosen: function(community) {

        this.communityChange = community;

      },

      createSelectBox: function(mobile, id, data, placeholder, onChangeFunction) {

        ///Desktop
        this.items = [];
        var ctr = 0;

        for (var k in data) {
          this.items.push({
            'name': data[k].name,
            id: ctr.toString()
          });
          ctr++;
        }

        var dataItems = {
          identifier: 'name',
          label: 'name',
          items: this.items
        };

        var store = new ItemFileReadStore({
          data: dataItems
        });
        store.comparatorMap = {};

        store.comparatorMap['name'] = function(a, b) {
          if (a < b) return -1;
          if (a > b) return 1;
          return 0;
        };


        var _this = this;

        function completed(items, findResult) {
          var sortedStore = new Memory({
            idProperty: "selector",
            data: items
          });
          if (!mobile) {

            this.comboBox = new ComboBoxDesktop({
              id: id,
              name: id,
              class: "jimu-widget-gfx",
              placeHolder: placeholder,
              store: sortedStore,
              onChange: function(data) {
                var p = lang.hitch(_this, onChangeFunction, data);
                p();
                //onChange(location);
              },
              searchAttr: "name",
              selectOnClick: true
            }, id);
          } else {
            this.comboBox = new ComboBox({
              id: id,
              store: sortedStore,
              class: "jimu-widget-gfx",
              readonly: false,
              placeHolder: placeholder,
              onChange: function(data) {
                //onchange(location);
              },
              value: ''
            }, id);
          }
        }

        function error(errData, request) {
          console.log("Failed in sorting data.");
        }
        var sortAttributes = [{
          attribute: "name",
          ascending: true
        }];
        store.fetch({
          onComplete: lang.hitch(this, completed),
          onError: lang.hitch(this, error),
          sort: sortAttributes
        });

      },

      dealWithSelectedFeature: function() {

        this.map.infoWindow.resize(this.config.infoWindow.width, this.config.infoWindow.height);
        var curFeature = this.editor.attributeInspector._currentFeature;
        var atiButtonsDiv = $(".atiButtons")[0];
        var atiAttributes = $('.atiAttributes')[0];

        domStyle.set($('.atiAttributes').children()[0], "display", "none");
        domStyle.set($(".atiAttachmentEditor")[0], "display", "none");

        this.createInfoTemplate(curFeature).then(lang.hitch(this, function(template) {
          domConstruct.create("div", {
            "innerHTML": template,
            "class": "feedbackTemplate"
          }, atiAttributes);
        }));

        // commentDiv
        var commentDiv = domConstruct.create("div", {
          "id": "commentDiv",
          "class": "commentDiv"
        }, atiAttributes);

        // attachmentDiv
        var attachmentDiv = domConstruct.create("div", {
          "id": "attachmentDiv",
          "class": "attachmentDiv"
        }, atiAttributes);

        var buttonsDiv = domConstruct.create("div", {
          "class": "buttonsDiv"
        }, atiButtonsDiv);

        // addCommentDiv
        domConstruct.create("div", {
          "class": "addCommentDiv"
        }, atiButtonsDiv);

        // Add Attachments
        var curLayer;
        if (curFeature.geometry.type === "point") {
          curLayer = this.agolUser.layerInfos[0].featureLayer;
        } else if (curFeature.geometry.type === "polyline") {
          curLayer = this.agolUser.layerInfos[1].featureLayer;
        } else {
          curLayer = this.agolUser.layerInfos[2].featureLayer;
        }

        var oid = curFeature.attributes.objectid;

        curLayer.queryAttachmentInfos(oid, lang.hitch(this, function(attachments) {
          var a = attachments;
          if (a && a.length > 0) {
            this.populateAttachmentDiv(a, attachmentDiv);
          }
        }));


        //hide the 'globalid' field in the attribute inspector
        // domStyle.set($('.atiAttributes').children().children().children()[4], "display", "none");
        if (this.agolUser.isAdmin) {
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
          this.queryConversation(commentDiv); //this.editor.attributeInspector._currentFeature);
        }

      },

      startup: function() {

        this.inherited(arguments);
        this.widgetManager = WidgetManager.getInstance();
        this.panelManager = PanelManager.getInstance();

        if (this.map.layerIds.length < 2) {
          var url = "http://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer";
          this.imagery = new ArcGISTiledMapServiceLayer(url, {
            opacity: 0,
            visible: true
          });
          this.map.addLayer(this.imagery, 1);
        }

        var t = this;
        var slider = new HorizontalSlider({
          name: "slider",
          value: 0,
          minimum: 0,
          maximum: 1,
          intermediateChanges: true,
          style: "width:175px;",
          onChange: function(value) {
            t.changeOpacity(value);
          }
        }, "imagerySlider").startup();

        this.getGeocodeExtents();

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

        if (this.attributeTable) {
          this.widgetManager.openWidget(this.attributeTable);
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
        if (dom.byId("commentDiv")) {
          dom.byId("commentDiv").innerHTML = "";
        }
        if (dom.byId("attachmentDiv")) {
          dom.byId("attachmentDiv").innerHTML = "";
        }
        domStyle.set("logoPanel", "display", "block");
        domStyle.set(dom.byId("groupInvitePanel"), "display", "none");
        domStyle.set(dom.byId("editorDiv"), "display", "none");
        // domStyle.set(dom.byId("submitConversation"), "display", "none");
        domStyle.set(dom.byId("viewAllFeedback"), "display", "none");
        domStyle.set(dom.byId("toggleAttribute"), "display", "none");

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

      engageFeedback: function(credential) {

        var engageFeedbackHandle = esriRequest({
          url: this.config.feedbackUrl + "/EngageFeedback?username=" + credential.userId + "&access_token=" + credential.token,
          handleAs: "json"
        });

        // edit JSON to change to custom HTML
        // use customField': "<b>info</b>" to override attribute inspector
        engageFeedbackHandle.then(lang.hitch(this, this.engageFeedbackHandleSucceeded), lang.hitch(this, this.engageFeedbackHandleFailed));

      },

      engageFeedbackHandleSucceeded: function(response, io) {

        this.agolUser = response;
        // this.addCustomField(this.agolUser);

        console.log(this.agolUser);

        var layer = new FeatureLayer(this.agolUser.layerInfos[0].featureLayer.url, this.agolUser.layerInfos[0].featureLayer.options);

        var linfo = [{
          layer: layer,
          title: "Feedback Status"
        }];

        var legendDijit = new Legend({
          map: this.map,
          layerInfos: linfo
        }, "legendDiv");

        legendDijit.startup();

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

      addCustomField: function(response) {

        var d = new Deferred();

        array.forEach(response.layerInfos, lang.hitch(this, function(layer) {
          array.forEach(layer.fieldInfos, lang.hitch(this, function(fi) {
            fi.customField = "<b>  Custom Field Test</b>";
          }));
        }));

        d.resolve(response);

        return d.promise;

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

        // use customField': "<b> this div</b>" to override attribute inspector

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

        // var layer = this.getLayerFromMap(featureLayer.url);

        domStyle.set(dom.byId("viewAllFeedback"), "display", "block");
        domStyle.set(dom.byId("toggleAttribute"), "display", "block");
        if (this.agolUser.isAdmin) {
          domStyle.set(dom.byId("editorDiv"), "display", "none");
        }

        /*
        console.log(this.editor.attributeInspector);

        this.editor.attributeInspector.on("next", lang.hitch(this, function(evt) {
          console.log(evt);

        }));*/
        //console.log(this.editor);

      },

      populateCommunities: function() {

        var extentName = [];
        if (this.extents) {

          ///Desktop
          extentName = [];
          var ctr = 0;
          for (var k in this.extents) {
            extentName.push({
              'name': k
            });
          }

          ///START OF Community Selector
          this.createSelectBox(false, "communitySelector", extentName, "Community Selector", this.changeExtent);

        } else {
          console.log("problem");
        }

      },

      getGeocodeExtents: function() {

        var qt = new QueryTask("http://gfx.esri.ca/arcgis/rest/services/Communities/Contributors/FeatureServer/1");
        var qp = lang.mixin(new Query(), {
          returnGeometry: false,
          where: "1=1",
          outFields: ["x_min",
            "y_min",
            "x_max",
            "y_max",
            "name_common",
            "name_official"
          ]
        });

        functional.forIn(this.config.contributorDataFields, function(f) {
          qp.outFields.push(f);
        });

        var req = qt.execute(qp);
        var extent = [];
        req.then(lang.hitch(this, function(results) {
          if (results && results.features && results.features.length > 0) {

            array.forEach(results.features, lang.hitch(this, function(f, i) {
              extent[f.attributes["name_common"]] = {
                "data_source": f.attributes["name_official"],
                "extent": {
                  "xmin": f.attributes["x_min"],
                  "xmax": f.attributes["x_max"],
                  "ymin": f.attributes["y_min"],
                  "ymax": f.attributes["y_max"]
                }
              };
            }));
            if (extent.Canada) {
              extent.Canada.extent.xmin = -136;
              extent.Canada.extent.xmax = -45;
              extent.Canada.extent.ymin = 52;
              extent.Canada.extent.ymax = 65;
            }
            this.extents = extent;
            this.populateCommunities();

          } else {
            console.log("error getting extents");
          }

        }));

      },

      onChangeCommunity: function(location) {

        this.changeExtent(location);

      },

      //get the data source name based on alias
      getDataSourceName: function(alias) {

        if (alias in this.extents) {
          return this.extents[alias].data_source;
        } else
          return "CanVec";

      },

      //get the alias based on data source name
      getAlias: function(contributor) {

        for (var i in this.extents) {
          if (this.extents[i].data_source == contributor) {
            return i;
          }
        }
        return "Canada";

      },

      changeExtent: function(community) {

        var extentObj = this.extents[community];
        var extent = new Extent(extentObj.extent.xmin, extentObj.extent.ymin, extentObj.extent.xmax, extentObj.extent.ymax, new SpatialReference({
          wkid: 4326
        }));
        this.map.setExtent(extent, true);

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

      attributeTableClosed: function() {

        console.log("remove");

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
              widget.on("close", lang.hitch(this, this.attributeTableClosed));
              widget.on("hide", lang.hitch(this, this.attributeTableClosed));
              widget.on("minimize", lang.hitch(this, this.attributeTableClosed));
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

      queryConversation: function(div) { //feature

        // console.log(this.editor.attributeInspector._currentFeature.attributes["globalid"]);
        var oid = this.editor.attributeInspector._currentFeature.attributes.globalid;
        if (!this.commentLayer) {
          this.commentLayer = new FeatureLayer(this.agolUser.conversationUrl);
        }
        //var featureLayer = new FeatureLayer(this.config.conversationUrl);

        //console.log(feature.attributes[feature.getLayer().objectIdField]);
        //var where = "obs_guid= '5888c59b-f8db-4667-9d94-cabd599339ff'";
        var where = "obs_guid = '" + oid + "'";

        var query = new Query();
        query.where = where;

        // var field = "globalid";
        var fields = ["*"];
        var queryTask = new QueryTask(this.commentLayer.url);
        query.returnGeometry = false;
        query.outFields = fields;

        queryTask.execute(query).then(lang.hitch(this, function(result) {

          if (result.features && result.features.length > 0) {
            this.populateCommentDiv(result, div);
          }
          // domConstruct.create("br", null, commentDiv);
          // domConstruct.create("div", {
          //   "id": "convoButton",
          //   "class": "jimu-btn submitButton",
          //   "innerHTML": this.nls.submitComment
          // }, commentDiv);

          // domStyle.set(dom.byId("submitConversation"), "display", "inline");

          //console.log(result.features[0].attributes[field]);
        }));

      },

      populateCommentDiv: function(result, div) {

        var content = [];
        content.push("<a id='commentToggle' class='hoverRed'>" + this.nls.feedbackComment + " (" + result.features.length + ")</a><div id='comments'><br />");
        array.forEach(result.features, function(feature) {
          // console.log(feature.attributes);
          content.push("<br />");
          content.push("<b>" + feature.attributes.Creator + "</b>");
          var d = new Date(feature.attributes.CreationDate);
          var date = (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
          content.push("&nbsp;<i>(" + date + ")</i>");
          content.push("<br />");
          content.push(feature.attributes.comments);
        });
        content.push("</div>");
        content.push("<hr>");
        div.innerHTML = content.join("");

        domStyle.set(dom.byId("comments"), "display", "none");

        on(dom.byId("commentToggle"), "click", lang.hitch(this, function() {
          this.toggleDiv(dom.byId("comments"));
        }));

      },

      populateAttachmentDiv: function(attachments, div) {

        var content = [];
        content.push("<a id='attachmentToggle' class='hoverRed'>" + this.nls.feedbackAttachment + " (" + attachments.length + ")</a><div id='attachments'><br />");
        array.forEach(attachments, function(attachment) {
          // console.log(attachment);
          content.push("<br />");
          content.push("<a href='" + attachment.url + "' target=_blank>" + attachment.name + "</a>");
        });
        content.push("</div>");
        content.push("<hr>");
        div.innerHTML = content.join("");

        domStyle.set(dom.byId("attachments"), "display", "none");

        on(dom.byId("attachmentToggle"), "click", lang.hitch(this, function() {
          this.toggleDiv(dom.byId("attachments"));
        }));

      },

      toggleDiv: function(div) {

        if (domStyle.get(div, "display") === "none") {
          domStyle.set(div, "display", "inline");
        } else {
          domStyle.set(div, "display", "none");
        }

      },

      submitConversation: function() {

        //console.log(dom.byId('converse').value);
        var comments = dom.byId('converse').value;
        var obs_guid = this.editor.attributeInspector._currentFeature.attributes.globalid;

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

        var commentUrl = this.config.feedbackUrl + "/Comment?username=" + this.credential.userId + "&access_token=" + this.credential.token + "&obstype=Observation" + curFeature.geometry.type + "&obsid=" + curFeature.attributes.objectid + "&obsguid=" + curFeature.attributes.obs_guid;
        var changeRequest = esriRequest({
          url: commentUrl,
          handleAs: "json"
        });

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

        // Set height of popup...
        // domStyle.set($(".contentPane")[0], "max-height", "300px");
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

        var feedbackButton = domConstruct.create("div", {
          "id": "reassign",
          "class": "feedbackStatusButton reassignButton mblButton"
        }, buttonsDiv);

        var feedbackImg = domConstruct.create("div", {
          "class": "statusImg"
        }, feedbackButton);

        var feedbackText = domConstruct.create("div", {
          "class": "statusText",
          "innerHTML": "<p>" + this.nls.reassignButton + "</p>"
        }, feedbackButton);

        var surface = Gfx.createSurface(feedbackImg, 30, 30);
        var path = surface.createPath({
          path: this.config.replyGraphic.path
        });
        path.setFill(this.config.replyGraphic.colour);
        path.setStroke(this.config.replyGraphic.colour);
        path.applyTransform(Gfx.matrix.scale(0.6));


        $(".reassignButton", buttonsDiv).on('click', lang.hitch(this, function(btn) {
          this.feedbackComment(-1, buttonsDiv);
          this.findIntersectingCommunities(this.editor.attributeInspector._currentFeature);
          //this.reassign = true;
        }));


        var oc = $(".feedbackStatusButton", buttonsDiv).on('click', lang.hitch(this, function(btn) {
          // console.log(btn.currentTarget.innerHTML);
          var splitTest = btn.currentTarget.id.split("changeStatus_");
          if (splitTest.length > 1) {
            var status = splitTest[1];
            this.feedbackComment(status, buttonsDiv);
            // this.changeFeedback(status);
          }
        }));

        // Destroy buttons and div on close
        var od = this.map.infoWindow.on("hide", lang.hitch(this, function() {
          if (oc) {
            oc.remove();
          }
          od.remove();
          $(".feedbackStatusButton", buttonsDiv).forEach(domConstruct.destroy);
          if (registry.byId('commentPane')) {
            registry.byId('commentPane').destroyRecursive();
          }
          $(".addCommentDiv").forEach(domConstruct.destroy);
          $(".buttonsDiv").forEach(domConstruct.destroy);
        }));
        // Destroy buttons on change
        var ac = this.editor.attributeInspector.on("next", lang.hitch(this, function() {
          if (oc) {
            oc.remove();
          }
          ac.remove();
          $(".feedbackStatusButton", buttonsDiv).forEach(domConstruct.destroy);
          if (registry.byId('commentPane')) {
            registry.byId('commentPane').destroyRecursive();
          }
        }));

      },

      feedbackComment: function(status, buttonsDiv) {

        if (!registry.byId("commentPane")) {

          domStyle.set(buttonsDiv, 'display', 'none');

          new ContentPane({
            "class": "commentPane",
            "id": "commentPane"
          }, $(".addCommentDiv")[0]);


          if (status === -1) {
            domConstruct.create("input", {
              "id": "intersectingCommunity",
              "innerHTML": this.nls.feedbackComment
            }, registry.byId("commentPane").domNode);
          }

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

            if (status === -1) {
              this.changeCommunity(this.communityChange, comment);
            } else {
              this.changeFeedback(status, comment);
            }
          }));

          var ocan = on(commentCancel, 'click', lang.hitch(this, function() {
            // ocan.remove();
            domStyle.set($(".addCommentDiv")[0], 'display', 'none');
            domStyle.set(buttonsDiv, 'display', 'block');
          }));

        } else {

          domStyle.set(buttonsDiv, 'display', 'none');
          domStyle.set($(".addCommentDiv")[0], 'display', 'block');
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

      changeCommunity: function(community, comment) {
        var curFeature = this.editor.attributeInspector._currentFeature;
        var changeURL = this.config.feedbackUrl + "/ChangeCommunity?username=" + this.credential.userId + "&access_token=" + this.credential.token + "&obstype=Observation" + curFeature.geometry.type + "&obsid=" + curFeature.attributes.objectid + "&community=" + community;
        var changeRequest = esriRequest({
          url: changeURL,
          handleAs: "json"
        });
        changeRequest.then(lang.hitch(this, this.changeFeedbackSuccess), lang.hitch(this, this.changeFeedbackFailure)).then(lang.hitch(this, function() {
          this.map.infoWindow.hide();
        }));
      },


      changeFeedbackSuccess: function(response) {

        // TODO - Look up name of graphics layer
        this.map.getLayer("graphicsLayer2").clearSelection();
        this.map.getLayer("graphicsLayer2").refresh();
        console.log(response);
        console.log('success');
        // var title = "Feedback status submitted";
        // var message = "Feedback status submitted.";
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

      createInfoTemplate: function(f) {

        var d = new Deferred();
        var att = f.attributes;

        var community = "<b>" + this.nls.feedbackTemplate.community + "</b><br />" + att.mgmt_data_source + "<hr>";
        var status = this.nls.FeedbackStates[att.feedback_status] + "<hr>";
        var obs_type = "<b>" + this.nls.feedbackTemplate.obs_type + "</b><br />" + this.nls.FeedbackTypes[att.feedback_obstype] + "<hr>";
        var desc;
        if (att.feedback_comments && att.feedback_comments !== null) {
          desc = "<b>" + this.nls.feedbackTemplate.description + "</b>&nbsp;" + att.feedback_comments + "<hr>";
        } else {
          desc = "";
        }
        var template = community + status + obs_type + desc;

        // var feedbackTemplate = new InfoTemplate("&nbsp;", template);

        d.resolve(template);
        return d.promise;

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

        domConstruct.create("div", {
          "id": name + "OK",
          "class": "jimu-btn",
          "innerHTML": this.nls.commentOK
        });

        registry.byId(name + "Buttons").addChild(dom.byId(name + "OK"));
        registry.byId(name + "Dialog").addChild(registry.byId(name + "Pane"));
        registry.byId(name + "Dialog").addChild(registry.byId(name + "Buttons"));

        on(dom.byId(name + "OK"), "click", function() {
          registry.byId(name + "Dialog").hide();
        });
        registry.byId(name + "Dialog").startup();

      }

    });
  }
);
