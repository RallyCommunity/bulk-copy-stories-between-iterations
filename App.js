Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    _destinationIteration:null,
    _destinationProject:null,
    _selectedRecordsOIDs : [],
    launch: function() {
        var that = this;
        var panel = Ext.create('Ext.panel.Panel', {
            layout: 'hbox',
            items:[
                {
                    xtype: 'rallyiterationcombobox',
                    itemId: 'iterationCombobox',
                    fieldLabel: 'select source Iteration:',
                    minWidth: 250,
                    margin: 10,
                    listeners: {
                        ready: this._onLoad,
                        select:this._onSelect,
                        scope: this
                    }
                },
                {
                    xtype: 'rallyprojectpicker',
                    fieldLabel: 'select destination project',
                    itemId:'destinationProject',
                    disabled: 'true',
                    margin: 10,
                    workspace:  this.getContext().getWorkspace()._ref, //limit choices to the current workspace
                    value: this.getContext().getProject(),
                    listeners:{
                        change: this._onProjectSelected,
                        scope: this
                    }
                },
                {
                    xtype: 'rallyiterationcombobox',
                    itemId: 'destinationIterationCombobox',
                    fieldLabel: 'select destination Iteration:',
                    minWidth: 250,
                    margin: 10,
                    disabled: true,
                    listeners: {
                        ready: this._onDestinationSelected,
                        select:this._onDestinationSelected,
                        scope: this
                    }
                },
                {
                    xtype: 'rallybutton',
                    itemId: 'copybuttton',
                    text: 'Copy',
                    disabled:true,
                    margin: 15,
                    handler: function() {
                        that._copy();
                    }
                }
            ]
        });
        this.add(panel);
    },
    _onLoad: function() {
        this.add({
            xtype: 'rallygrid',
            columnCfgs: [
                'Name',
                'FormattedID'
            ],
            context: this.getContext(),
            enableBulkEdit: true,
            storeConfig:{
                model: 'UserStory',
                filters:[this._getFilter()]
            },
            listeners: {
                select: this._onRecordSelected,
                scope: this
            }
        });
    },
    _onSelect:function(){
        var grid = this.down('rallygrid');
        var store = grid.getStore();
        store.clearFilter(true);
        store.filter(this._getFilter());
    },
    _getFilter: function() {
        return {
            property: 'Iteration',
            operator: '=',
            value:  this.down('#iterationCombobox').getValue()
        };
    },
    _getDesitnationIteration: function() {
        return  this.down('#destinationIterationCombobox').getValue();
    },

    _onProjectSelected: function() {
        this._destinationProject = this.down('#destinationProject').getValue();
        console.log('project', this._destinationProject);
        Ext.ComponentQuery.query('#destinationIterationCombobox')[0].setProject(this._destinationProject);
    },
    _onRecordSelected:function(){
        var that = this;
        var grid = this.down('rallygrid');
        var selectedRecords = grid.getSelectionModel().getSelection();
        _.each(selectedRecords, function(record){
            that._selectedRecordsOIDs.push(record.data.ObjectID);
        });
        that._selectedRecordsOIDs = _.uniq(that._selectedRecordsOIDs);
        console.log(that._selectedRecordsOIDs);
        this._onReadyToCopy();
    },
    _onReadyToCopy:function(oids){
        Ext.ComponentQuery.query('#destinationIterationCombobox')[0].enable();
        Ext.ComponentQuery.query('#destinationProject')[0].enable();
        Ext.ComponentQuery.query('#copybuttton')[0].enable();

    },
    _onDestinationSelected:function(){
       this._destinationIteration =  this._getDesitnationIteration();
       this._destinationProject = this.down('#destinationProject').getValue();
       console.log(this._destinationIteration);
    },
    _copy:function(){
        this._getModel().then({
            success: this._readSelected,
            scope: this
        });
    },
    _getModel:function(){
        return Rally.data.ModelFactory.getModel({
            type:'UserStory'
        });
    } ,
    _readSelected:function(model){
        var that = this;
        _.each(that._selectedRecordsOIDs,function(oid){
           model.load(oid, {
               fetch: true,
               scope:this,
               callback:function(result, operation) {
                   if(operation.wasSuccessful()){
                       console.log('copying... ' + result.get('FormattedID') + ' ' + result.get('Iteration')._refObjectName) ;
                       var clone = Rally.data.util.Record.copyRecord(result);
                       clone.set('Project', this._destinationProject);
                       clone.set('Iteration', this._destinationIteration);
                       return clone.save({
                           callback:function(result,operation){
                               if(operation.wasSuccessful()){
                                   console.log('created ObjectID: ',result.get('ObjectID'), 'FormattedID: ', result.get('FormattedID')) ;
                               }
                               else{
                                   console.log('clone operation failed');
                               }
                           }
                       });
                   }
                   else{
                       console.log('oh, noes!');
                   }
               }
           });
        },this);
    }
});
