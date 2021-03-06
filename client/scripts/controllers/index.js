'use strict';
/*global $:false, io:false, autosize:false */

angular.module('chatty')
  .controller('chattyCtrl', function ($scope, $document, $timeout, server, modals, sockets, chats) {
    $document.ready(function() {

        var windowHeight = $(window).height();
        var leftover = windowHeight - $('.nav').height();
        var chats = $('.chats');
        chats.css('height', leftover.toString() + 'px');
        $('.user-list').css('height', leftover.toString() + 'px');

        var reply = $('.reply');
        var replyBox = $('.reply-box');
        var replyMargin = 2 * parseInt(reply.css('margin-left'), 10);
        var replyPadding = 2 * parseInt(reply.css('padding-left'), 10);
        var replyBorder = 2 * parseInt(reply.css('border-width'), 10);
        var replyWidth = $('.reply-box').width() - replyMargin - replyPadding - replyBorder;
        reply.css('width', replyWidth.toString() + 'px');

        var conversationBox = $('.conversation-box');

        var remainingHeight = leftover - $('.reply-box').height();
        console.log(remainingHeight);
        conversationBox.css('height', remainingHeight.toString() + 'px');

        autosize($('#new-message'));
        autosize(reply);

        reply.on('autosize:resized', function() {
            console.log('textarea height updated');
            var remainingHeight = leftover - $('.reply-box').height();
            console.log(remainingHeight);
            conversationBox.css('height', remainingHeight.toString() + 'px');
        });

        conversationBox.scroll(function() {
          if (!conversationBox.scrollTop()) {
            sockets.getMessages(socket, $scope.curConversation);
          }
        });

        chats.scroll(function() {
          if (chats.scrollTop() + chats.outerHeight() >= chats.prop('scrollHeight') - 1) {
            sockets.getConversations(socket);
          }
        });
    });

    var socket,
        listsData,
        consData,
        messagesData,
        conversationBox = $('.conversation-box');
    $scope.userList = [];
    $scope.loading = false;
    $scope.loginError = false;

    $scope.conversationsList = [];

    // $scope.$watch(function() {
    //                 return sockets.checkData();
    //               },
    //               function() {
    //                 data = sockets.getData();
    //                 $scope.onlineList = data.onlineList;
    //                 if (data.userList && data.onlineList) {
    //                   console.log('current userList: ' + data.userList);
    //                   console.log('current onlineList: ' + data.onlineList);
    //                   var index = data.userList.indexOf($scope.username);
    //                   if (index > -1) {
    //                     data.userList.splice(index, 1);
    //                   }
    //                   data.userList.sort(sortByOnline);
    //                   $scope.userList = data.userList;
    //                 }
    //                 console.log('saw change in data');
    //                 console.log(sockets.checkData());
    //                 console.log('sorted: ' + $scope.userList);
    //                 $scope.conversationsList = data.conversationsList;
    //                 console.log('conversationsList');
    //                 console.debug($scope.conversationsList);
    // }, true);

    $scope.$watch(function() {
                    return sockets.checkListsData();
                  },
                  function() {
                    listsData = sockets.getListsData();
                    $scope.onlineList = listsData.onlineList;
                    if (listsData.userList && listsData.onlineList) {
                      console.log('current userList: ' + listsData.userList);
                      console.log('current onlineList: ' + listsData.onlineList);
                      var index = listsData.userList.indexOf($scope.username);
                      if (index > -1) {
                        listsData.userList.splice(index, 1);
                      }
                      listsData.userList.sort(sortByOnline);
                      $scope.userList = listsData.userList;
                    }
                    console.log('sorted: ' + $scope.userList);
                  }, true);

    $scope.$watch(function() {
                    return sockets.checkConsData();
                  },
                  function() {
                    consData = sockets.getConsData();
                    $scope.conversationsList = consData.conversationsList;
                    console.log('conversationsList');
                    console.debug($scope.conversationsList);
                    console.info(consData.gettingConvos);
                    $scope.gettingConvos = consData.gettingConvos;
                  }, true);

    $scope.$watch(function() {
                    return sockets.checkMessagesData();
                  },
                  function() {
                    messagesData = sockets.getMessagesData();
                    if (messagesData.changedId) {
                      if ($scope.curConversation) {
                        if (messagesData.changedId == $scope.curConversation.id) {
                          scrollToBottom(conversationBox);
                          sockets.readMessage(socket, $scope.curConversation.id);
                        } else {
                          $scope.conversationsList[
                                  messagesData.changedIndex].unread += 1;
                        }
                      } else {
                        $scope.conversationsList[
                                  messagesData.changedIndex].unread += 1;
                      }
                    }
                  }, true);

    var sortByOnline = function(a, b) {
      var aOnline = contains($scope.onlineList, a);
      var bOnline = contains($scope.onlineList, b);
      if (aOnline && !bOnline) {
        return -1;
      } else if (!aOnline && bOnline) {
        return 1;
      } else {
        if (a < b) {
          return -1;
        } else {
          return 1;
        }
      }
    };

    var contains = function(array, value) {
      return array.indexOf(value) > -1;
    };

    $scope.login = function() {
      $scope.loginMessage = 'Logging In...';
      $scope.loading = true;
      if ($scope.username && $scope.password) {
        var user = {
                      username: $scope.username,
                      password: $scope.password
                   };
        socket = io();
        sockets.authenticate(socket, user).then(
          function(returnedSocket) {
            socket = returnedSocket;
            console.log('yes');
            $scope.password = '';
            waitForInfo();
          },
          function(error) {
            console.log('no');
            if (error == 'User Error') {
              $scope.loginMessage = 'Invalid Username/Password Combination';
            } else {
              $scope.loginMessage = 'There was a server problem with logging in.';
            }
            sockets.disconnect(socket);
            $scope.loginError = true;
            sockets.reload('//cdn.socket.io/socket.io-1.3.5.js');
          });
      }
    };

    $scope.signup = function() {
      $scope.loginMessage = 'Signing Up...';
      $scope.loading = true;
      if ($scope.username && $scope.password) {
        var user = {
                    username: $scope.username,
                    password: $scope.password
                   };
        server.postUserSignup(user).then(
          function () {
            $scope.login();
          },
          function (errorMessage) {
            if (contains(errorMessage.code.toLowerCase(), 'taken')) {
              $scope.loginMessage = 'This username has already been taken.';
            } else {
              $scope.loginMessage = 'There was a server problem with signing up.';
            }
            $scope.loginError = true;
          });
      }
    };

    $scope.validUsername = function(event) {
      if (event.keyCode > 47 && event.keyCode < 58) {
        if (event.shiftKey) {
          event.preventDefault();
        }
      } else if (event.keyCode > 64 && event.keyCode < 91) {
        return
      } else if (event.keyCode > 95 && event.keyCode < 106) {
        return
      } else if (event.keyCode != 8 && event.keyCode != 9) {
        event.preventDefault();
      }
    };

    var waitForInfo = function() {
      $scope.loginMessage = 'Loading Data...';
      $timeout(function() {
        modals.login.modal('hide');
        $timeout(function() {
                  $scope.loading = false;
                }, 1000);
      }, 1000);
    };

    $scope.restartLogin = function() {
      $scope.loading = false;
      $scope.loginError = false;
    };

    $scope.startNewConversation = function() {
      modals.newConversation.modal('show');
    };

    $scope.cancel = function() {
      modals.newConversation.modal('hide');
    };

    $scope.sendNewMessage = function() {
      if ($scope.newRecipient && $scope.newMessage) {
        if (contains($scope.userList, $scope.newRecipient)) {
          console.log('sending new message!');
          var conversation = {
            origRecipient: $scope.newRecipient,
            messages: [
              {
                time: Date.now(),
                sender: $scope.username,
                content: $scope.newMessage.trim()
              }
            ]
          }
          sockets.sendConversation(socket, conversation);
          console.log('conversationsList');
          console.log($scope.conversationsList);
          modals.newConversation.modal('hide');
          $timeout(function() {
            $scope.newRecipient = '';
            $scope.newMessage = '';
          }, 1000)
        } else {
          var newRecipient = $scope.newRecipient;
          $scope.newRecipient += ' is not a valid user!';
          showError($('#new-recipient'), 'black');
          $timeout(function() {
            $scope.newRecipient = newRecipient;
          }, 1000);
        }
      }
    };

    var showError = function(element, origColor) {
      console.log(origColor);
      element.css('color', 'red');
      $timeout(function() {
        element.css('color', origColor);
      }, 1000);
    };

    $scope.sendMessage = function(event) {
      if (!$scope.curConversation) {
        event.preventDefault();
        $scope.replyMessage = 'Select a conversation';
        showError($('.reply'), 'black');
        $timeout(function() {
          $scope.replyMessage = '';
        }, 1000);
      } else {
        if (!event.shiftKey && event.keyCode == 13 && $scope.replyMessage) {
          event.preventDefault();
          var message = {
            sender: $scope.username,
            content: $scope.replyMessage.trim()
          }
          $scope.replyMessage = '';
          $scope.curConversation.messages.push(message);
          chats.updateConversationInfo($scope.curConversation, Date.now());
          scrollToBottom(conversationBox);
          var index = getConsIndex($scope.curConversation.id);
          console.log(index);
          console.log('^cur index');
          if (index) {
            console.log('splicing and dicing');
            $scope.conversationsList.splice(index, 1);
            $scope.conversationsList.unshift($scope.curConversation);
          }
          sockets.sendMessage(socket, message, $scope.curConversation.id);
        }
      }
    };

    $scope.updateConversation = function(index) {
      $scope.curConversation = $scope.conversationsList[index];
      scrollToBottom(conversationBox);
      if ($scope.curConversation.unread) {
        $scope.curConversation.unread = 0;
        sockets.readMessage(socket, $scope.curConversation.id);
      }
      console.log($scope.curConversation.messages);
    };

    var scrollToBottom = function(object) {
      $timeout(function() {
            object.animate({ scrollTop: object.prop('scrollHeight') }, 'slow');
            console.log('now running');
            }, 500);
    }

    var getConsIndex = function(id) {
      var i;
      for (i = 0; i < $scope.conversationsList.length; i++) {
        if ($scope.conversationsList[i].id == id) {
          return i;
        }
      }
    }

    $scope.logout = function() {
      location.reload(true);
    };

  });
