'use strict';
/*global $:false, FB:false, jQuery:false */

angular.module('chatty').factory('sockets', function ($q, $rootScope) {
  
  var data = {};
  
  var getData = function() {
    return data;
  }
  
  var dataChanged = 0;
  
  var checkData = function() {
    return dataChanged;
  }
  
  var authenticate = function(socket, user) {
    var deferred = $q.defer();
    socket.user = user.username; //maybe remove this - should probably remove this
    socket.emit('authentication', user);
    
    socket.on('authenticated', function(authenticated) {
      if (authenticated) {
        defineSocket(socket);
        deferred.resolve();
      }
    });
    
    socket.on('unauthorized', function(err){
      console.log("There was an error with the authentication:", err.message);
      deferred.reject();
    });
    
    return deferred.promise;
  }
  
  //used to load basic info  - lastest conversations and online list
  var getBasicInfo = function(socket) {
    var deferred = $q.defer();
    
    //request online list
    //request latest conversations
    
    
    setTimeout(function() { deferred.resolve(data) }, 1000);
    
    return deferred.promise;
  };
  
  var defineSocket = function(socket) {
    //define socket properties
    socket.on('onlineList', function(onlineList) {
      //run some kind of callback to index.js that causes the online list to be updated
      console.log('onlineList: ' + onlineList);
      console.log(socket.user);
      data.onlineList = onlineList;
      dataChanged += 1;
      $rootScope.$apply();
    });
    
    socket.on('userList', function(serverData) {
      console.log('user list: ' + serverData.user);
      console.log(socket.user);
      data.userList = serverData.userList;
      dataChanged += 1;
      console.log(dataChanged);
      $rootScope.$apply();
    });
  };
  
  var getConversation = function(socket) {
    //get details on a conversation
  };
  
//  var getOnlineList = function(socket) {
//    console.log('emit onlineList');
////    socket.emit('onlineList');
//    //I don't think you should ever be getting online list...it should be sent to you automatically...
//  };

  return {
    authenticate: authenticate,
    getBasicInfo: getBasicInfo,
    defineSocket: defineSocket,
    getData: getData,
    checkData: checkData,
  };
});