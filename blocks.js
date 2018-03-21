/**

@module Moac:blocks
*/



/**
The McBlocks collection, with some moac additions.

@class McBlocks
@constructor
*/



McBlocks = new Mongo.Collection('moac_blocks', {connection: null});

// if(typeof PersistentMinimongo !== 'undefined')
//     new PersistentMinimongo(McBlocks);


/**
Gives you reactively the lates block.

@property latest
*/
Object.defineProperty(McBlocks, 'latest', {
    get: function () {
        return McBlocks.findOne({}, {sort: {number: -1}}) || {};
    },
    set: function (values) {
        var block = McBlocks.findOne({}, {sort: {number: -1}}) || {};
        values = values || {};
        McBlocks.update(block._id, {$set: values});
    }
});

/**
Stores all the callbacks

@property _forkCallbacks
*/
McBlocks._forkCallbacks = [];


/**
Start looking for new blocks

@method init
*/
McBlocks.init = function(){
    if(typeof chain3 === 'undefined') {
        console.warn('McBlocks couldn\'t find chain3, please make sure to instantiate a chain3 object before calling McBlocks.init()');
        return;
    }

    // clear current block list
    McBlocks.clear();

    Tracker.nonreactive(function() {
        observeLatestBlocks();
    });
};

/**
Add callbacks to detect forks

@method detectFork
*/
McBlocks.detectFork = function(cb){
    McBlocks._forkCallbacks.push(cb);
};

/**
Clear all blocks

@method clear
*/
McBlocks.clear = function(){
    _.each(McBlocks.find({}).fetch(), function(block){
        McBlocks.remove(block._id);
    });
};


/**
The global block filter instance.

@property filter
*/
var filter = null;

/**
Update the block info and adds additional properties.

@method updateBlock
@param {Object} block
*/
function updateBlock(block){

    // reset the chain, if the current blocknumber is 100 blocks less 
    if(block.number + 10 < McBlocks.latest.number)
        McBlocks.clear();

    block.difficulty = block.difficulty.toString(10);
    block.totalDifficulty = block.totalDifficulty.toString(10);

    chain3.mc.getGasPrice(function(e, gasPrice){
        if(!e) {
            block.gasPrice = gasPrice.toString(10);
            McBlocks.upsert('bl_'+ block.hash.replace('0x','').substr(0,20), block);
        }
    });
};

/**
Observe the latest blocks and store them in the Blocks collection.
Additionally cap the collection to 50 blocks

@method observeLatestBlocks
*/
function observeLatestBlocks(){

    // get the latest block immediately
    chain3.mc.getBlock('latest', function(e, block){
        if(!e) {
            updateBlock(block);
        }
    });

    // GET the latest blockchain information
    filter = chain3.mc.filter('latest').watch(checkLatestBlocks);

};

/**
The observeLatestBlocks callback used in the block filter.

@method checkLatestBlocks
*/
var checkLatestBlocks = function(e, hash){
    if(!e) {
        chain3.mc.getBlock(hash, function(e, block){
            if(!e) {
                var oldBlock = McBlocks.latest;

                // console.log('BLOCK', block.number);

                // if(!oldBlock)
                //     console.log('No previous block found: '+ --block.number);

                // CHECK for FORK
                if(oldBlock && oldBlock.hash !== block.parentHash) {
                    // console.log('FORK detected from Block #'+ oldBlock.number + ' -> #'+ block.number +'!');

                    _.each(McBlocks._forkCallbacks, function(cb){
                        if(_.isFunction(cb))
                            cb(oldBlock, block);
                    });
                }

                updateBlock(block);

                // drop the 50th block
                var blocks = McBlocks.find({}, {sort: {number: -1}}).fetch();
                if(blocks.length >= 5) {
                    var count = 0;
                    _.each(blocks, function(bl){
                        count++;
                        if(count >= 5)
                            McBlocks.remove({_id: bl._id});
                    });
                }
            }
        });

    // try to re-create the filter on error
    // TODO: want to do this?
    } else {
        filter.stopWatching();
        filter = chain3.mc.filter('latest').watch(checkLatestBlocks);
    }
};