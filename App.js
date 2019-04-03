Ext.define('CustomApp', {
    extend: "Rally.app.App", componentCls: "app", layout: { type: "vbox", align: "stretch" },

    artefactTypes: [
        {  ID: 1, Name: "User Story", value: 'HierarchicalRequirement'},
        {  ID: 2, Name: 'Defect', value: 'Defect'},
        {  ID: 3, Name: 'Task', value: 'Task'},
        {  ID: 4, Name: 'Test Case', value: 'TestCase'},
    ],
    items: [
        {
            xtype: "panel", 
            layout: "anchor", 
            border: !0, 
            fieldDefaults: { labelWidth: 40 },
            defaultType: "textfield", 
            bodyPadding: 5,
            items: [
                {
                    xtype: 'container',
                    layout: 'hbox',
                    width: '100%',
                    itemId: 'selectorBox'
                },
                {
                    fieldLabel: "Query", 
                    itemId: "queryField", 
                    anchor: "100%", 
                    width: 700, 
                    height: 200,
                    xtype: "textarea", 
                    value: '{\n    "ObjectID": {$gt:0},\n    "__At": "current"\n}'
                },
                { 
                    fieldLabel: "Fields", 
                    itemId: "fieldsField", 
                    anchor: "100%", 
                    width: 700, 
                    value: "ObjectID, _ValidFrom, _UnformattedID, Name" 
                },
                { 
                    fieldLabel: "Sort", 
                    itemId: "sortField", 
                    anchor: "100%", 
                    width: 700, 
                    value: "{'ObjectID' : -1, '_ValidFrom': 1}" 
                },
                { 
                    fieldLabel: "Page Size", 
                    itemId: "pageSizeField", 
                    anchor: "100%", 
                    width: 700, 
                    value: "10" 
                }
            ],
            buttons: [
                { 
                    xtype: "rallybutton", 
                    text: "Search", 
                    itemId: "searchButton"

                }, 
                { 
                    xtype: "rallybutton", 
                    text: "CSV", 
                    itemId: "csvButton" 
                }
            ]
        },
        { 
            xtype: "panel", 
            itemId: "gridHolder", 
            layout: "fit", 
            height: 400 
        }
    ],

    _addItemSelector: function(piType) {
        var me = this;
        var selectorBox = this.down('#selectorBox');
        selectorBox.add( Ext.create('Rally.ui.combobox.ArtifactSearchComboBox',{
            fieldLabel: 'Top Level Item: ',
            itemId: 'itemSelector',
            margin: 10,
            storeConfig: {
                models: [ 'portfolioitem/' + piType.rawValue.toLowerCase()]
            },
            listeners: {
                select: function(itemSelector) {
                    me._updateQuerySetting( "_ItemHierarchy", itemSelector.getRecord().get('ObjectID'));
                },
                scope: me
            }
        }));

    },

    _addTypePicker: function() {
        var me = this;
        var store = Ext.create("Ext.data.Store", {

            fields: ['ID', 'Name', 'value'], 
            data: { records: this.artefactTypes },
            proxy: {
                type: "memory",
                reader: { type: "json", root: "records" }
            }
        });

        this.down('#selectorBox').add ( Ext.create('Rally.ui.picker.MultiObjectPicker', {
            store: store,
            margin: 10,
            matchFieldName: 'Name',
            selectionKey: 'ID',
            recordKey: 'ID',
            fieldLabel: 'Lower types',
            listeners: {
                collapse: function(items) {
                    var types = [];
                    _.each( items.getValue(), function (item) {
                        types.push(item.get('value'));
                    });
                    me._updateQuerySetting("_TypeHierarchy", { "$in" : types});
                }
            }
        }));
    },
    launch: function () {
        var selectorBox = this.down('#selectorBox');
        var button = this.down("#searchButton"); 
        var button2 = this.down("#csvButton");

        var me = this;
        selectorBox.add( Ext.create('Rally.ui.combobox.PortfolioItemTypeComboBox', {
            margin: 10,
//             storeConfig: {
//                 load: function(store, records,) {
//                     debugger;
// //                    me.artefactTypes.push
//                 }
//             },
            listeners: {
                ready: function(piType) {
                    _.each(piType.store.getRecords(), function(record) {
                        me.artefactTypes.push( {
                            ID: me.artefactTypes.length + 1,
                            Name: record.get('Name'),
                            value: record.get('TypePath')
                        });
                    });
                    me._addTypePicker();
                    if ( me.down('#itemSelector')) {
                        me.down('#itemSelector').destroy();
                    }
                    me._addItemSelector(piType);
                },
                select: function(piType) {
                    if ( me.down('#itemSelector')) {
                        me.down('#itemSelector').destroy();
                    }
                    me._addItemSelector(piType);
                }
            },
            scope: me
        }));
        button.on("click", this.searchClicked, this);
        button2.on("click", this.csvClicked, this);
    },

    _updateQuerySetting: function(term, value) {
        var currentQuery = Ext.JSON.decode(this.down('#queryField').value);
        if (undefined !== value) {
            currentQuery[term] = value;
        } else {
            delete currentQuery[term];
        }
        this.down('#queryField').setValue(this._prettyPrintJSON(Ext.JSON.encode(currentQuery)));
        this.searchClicked();

    },

    _prettyPrintJSON: function (jstring) {
        var retStr = "";
        var indent = 0;
        var i = 0;
        _.each(jstring, function(c) {
            if (c === '{') {
                retStr += c + "\n";
                indent += 4;
                for ( i =0; i < indent; i++) {  retStr += " "; }
            } else if ( c === '}') {
                retStr += "\n";
                indent -= 4;
                for ( i =0; i < indent; i++) { retStr += " "; }
                retStr += c;
            } else if (c === ',') {
                retStr += c + "\n";
                for ( i =0; i < indent; i++) { retStr += " "; }
            } else {
                retStr += c;
            }
        });

        return retStr;
    },

    searchClicked: function () {
        var queryField = this.down("#queryField"), 
            query = queryField.getValue(), 
            selectedFields = this.down("#fieldsField").getValue();

        if (selectedFields === "true") {
            selectedFields =  !0 ;
        } else {
            selectedFields =  selectedFields.split(", ");
        }
console.log(selectedFields);
        var sort = this.down("#sortField").getValue(), 
            pageSize = this.down("#pageSizeField").getValue(), 
            parsedPageSize = parseInt(pageSize, 10);

        pageSize = parsedPageSize ? parsedPageSize : 10;
        var callback = Ext.bind(this.processSnapshots, this);
        this.doSearch(query, selectedFields, sort, pageSize, callback);
    },

    exportGrid: function (grid) {
        if (Ext.isIE) {
            this._ieToExcel(grid);
        } else {
            var data = this._getCSV(grid);
            window.location = 'data:text/csv;charset=utf8,' + encodeURIComponent(data);
        }
    },

    _escapeForCSV: function (string) {
        string = string.replace(/"/g, '');
        string = '"' + string + '"';
        return string;
    },

    _getFieldText: function (fieldData) {
        var text;

        if (fieldData === null || fieldData === undefined) {
            text = '';

        } else if (fieldData._refObjectName && !fieldData.getMonth) {
            text = fieldData._refObjectName;

        } else if (fieldData instanceof Date) {
            text = Ext.Date.format(fieldData, this.dateFormat);

        } else if (typeof (fieldData) === "number") {
            text = '' + fieldData;

        } else if (!fieldData.match) { // not a string or object we recognize...bank it out
            text = '';

        } else {
            text = fieldData;
        }

        return text;
    },

    _getFieldTextAndEscape: function (fieldData) {
        var string = this._getFieldText(fieldData);

        return this._escapeForCSV(string);
    },

    _getCSV: function (grid) {
        var cols = grid.columns;
        var store = grid.store;
        var data = '';

        var that = this;
        Ext.each(cols, function (col) {
            if (col.hidden !== true) {
                data += that._getFieldTextAndEscape(col.text) + ',';
            }
        });
        data += "\r\n";

        store.each(function (record) {
            var entry = record.getData();
            Ext.each(cols, function (col) {
                if (col.hidden !== true) {
                    var fieldName = col.dataIndex;
                    var text = entry[fieldName];

                    data += that._getFieldTextAndEscape(text) + ',';
                }
            });
            data += "\r\n";
        });

        return data;
    },

    _ieGetGridData: function (grid, sheet) {
        var that = this;
//        var resourceItems = grid.store.data.items;
        var cols = grid.columns;

        Ext.each(cols, function (col, colIndex) {
            if (col.hidden !== true) {
                console.log('header: ', col.text);
                sheet.cells(1, colIndex + 1).value = col.text;
            }
        });

        var rowIndex = 2;
        grid.store.each(function (record) {
            var entry = record.getData();

            Ext.each(cols, function (col, colIndex) {
                if (col.hidden !== true) {
                    var fieldName = col.dataIndex;
                    var text = entry[fieldName];
                    var value = that._getFieldText(text);

                    sheet.cells(rowIndex, colIndex + 1).value = value;
                }
            });
            rowIndex++;
        });
    },

    _ieToExcel: function (grid) {
        if (window.ActiveXObject) {
            var xlApp, xlBook;
            try {
                xlApp = new ActiveXObject("Excel.Application");
                xlBook = xlApp.Workbooks.Add();
            } catch (e) {
                Ext.Msg.alert('Error', 'For the export to work in IE, you have to enable a security setting called "Initialize and script ActiveX control not marked as safe" from Internet Options -> Security -> Custom level..."');
                return;
            }

            xlBook.worksheets("Sheet1").activate();
            var XlSheet = xlBook.activeSheet;
            xlApp.visible = true;

            this._ieGetGridData(grid, XlSheet);
            XlSheet.columns.autofit();
        }
    },

    csvClicked: function () {

        var queryField = this.down("#queryField"), 
            query = queryField.getValue(), 
            selectedFields = this.down("#fieldsField").getValue();

        if (selectedFields === "true") {
            selectedFields =  !0 ;
        } else {
            selectedFields =  selectedFields.split(", ");
        }        
        var sort = this.down("#sortField").getValue(), pageSize = this.down("#pageSizeField").getValue(), parsedPageSize = parseInt(pageSize, 10);
        pageSize = parsedPageSize ? parsedPageSize : 10;
        var callback = Ext.bind(this.processSnapshotsCSV, this);
        this.doSearch(query, selectedFields, sort, pageSize, callback);
        Ext.Msg.alert('Please be patient it will take sometime to download...');
    },

    createSortMap: function (csvFields) {
        var fields = csvFields.split(", "),
            sortMap = {}; 
        for (var field in fields) { 
            if (fields.hasOwnProperty(field)) {
                sortMap[field] = 1; 
                return sortMap;
            }
        }
    },

    doSearch: function (query, fields, sort, pageSize, callback) {
        var workspace = this.context.getWorkspace().ObjectID, 
            queryUrl = "https://rally1.rallydev.com/analytics/v2.0/service/rally/workspace/" + workspace + "/artifact/snapshot/query.js",
            params = { find: query }; 
        if (fields) {
            params.fields = Ext.JSON.encode(fields);
        }
        if (sort) {
            params.sort = sort;
        }
        if (pageSize) {
            params.pagesize = pageSize;
        }
        Ext.Ajax.cors = !0;
        console.log("About to do:", queryUrl, params);
        Ext.Ajax.request({
            url: queryUrl, 
            method: "GET", 
            params: params, 
            withCredentials: !0, 
            success: function (response) {
                var text = response.responseText, json = Ext.JSON.decode(text); 
                callback(json.Results);
            },
            failure: function (error) {
                var errorMsgs = {},
                    errorHtml = "";
                
                if (error.responseText){
                    errorMsgs = Ext.JSON.decode(error.responseText);
                }
                else {
                    errorMsgs = { Errors: [ error.statusText ]};
                }
                _.each(errorMsgs.Errors, function(error) {
                    errorHtml += "<p>" + error + "</p>";
                });

                Ext.create('Rally.ui.dialog.Dialog',{
                    autoShow: true,
                    draggable: true,
                    closable: true,
                    width: 600,
                    title: 'Error Msg:',
                    items: {
                        xtype: 'component',
                        html: errorHtml
                    }
                });

            }
        });
    },

    processSnapshots: function (snapshots) {
        var selectedFields = this.getFieldsFromSnapshots(snapshots), snapshotStore = Ext.create("Ext.data.Store", {
            storeId: "snapshotStore",

            fields: selectedFields, data: { items: snapshots },
            proxy: {
                type: "memory",
                reader: { type: "json", root: "items" }
            }
        }),
            columns = this.createColumnsForFields(selectedFields),
            snapshotGrid = Ext.create("Ext.grid.Panel", { 
                title: "Snapshots", 
                store: snapshotStore, 
                columns: columns, 
                height: 400 
            });
        var gridHolder = this.down("#gridHolder"); 
            gridHolder.removeAll(!0);
            gridHolder.add(snapshotGrid);
    },

    processSnapshotsCSV: function (snapshots) {
        var selectedFields = this.getFieldsFromSnapshots(snapshots), 
            snapshotStore = Ext.create("Ext.data.Store", {
                storeId: "snapshotStore",
                fields: selectedFields, data: { items: snapshots },
                proxy: {
                    type: "memory",
                    reader: { type: "json", root: "items" }
                }
            }),
            columns = this.createColumnsForFields(selectedFields),
            snapshotGrid = Ext.create("Ext.grid.Panel", { 
                title: "Snapshots", 
                store: snapshotStore, 
                columns: columns, 
                height: 400 
            }); 
        var gridHolder = this.down("#gridHolder"); 
        gridHolder.removeAll(!0);
        gridHolder.add(snapshotGrid);
        this.exportGrid(snapshotGrid);
    },

    getFieldsFromSnapshots: function (snapshots) {
        if (0 === snapshots.length) { return []; }
        var snapshot = snapshots[0], fields = [];
        for (var key in snapshot) {
            if (snapshot.hasOwnProperty(key)) { fields.push(key); }
        }
        return fields;
    },

    createColumnsForFields: function (fields) {
        var columns = [];
        var i = 0;
        for ( i = 0; fields.length > i; ++i) {
            var col = { 
                header: fields[i], 
                dataIndex: fields[i] 
            };
            if ( "Name" === fields[i]) { col.flex = 1;}
            columns.push(col);
        } 
        return columns;
    }

});
