'use strict';
/*global $:false, io:false, autosize:false */

angular.module('chatty')
  .controller('chattyCtrl', function ($scope, $document, $timeout, server, modals, sockets, chats) {
    $document.ready(function() {

        var windowHeight = $(window).height();
        var leftover = windowHeight - $('.nav').height();
        $('.chats').css('height', leftover.toString() + 'px');
        $('.user-list').css('height', leftover.toString() + 'px');

        var replyMargin = 2 * parseInt($('.reply').css('margin-left'), 10);
        var replyPadding = 2 * parseInt($('.reply').css('padding-left'), 10);
        var replyBorder = 2 * parseInt($('.reply').css('border-width'), 10);
        var replyWidth = $('.reply-box').width() - replyMargin - replyPadding - replyBorder;
        $('.reply').css('width', replyWidth.toString() + 'px');

        var remainingHeight = leftover - $('.reply-box').height();
        console.log(remainingHeight);
        $('.conversation-box').css('height', remainingHeight.toString() + 'px');

        autosize($('#new-message'));
        autosize($('#reply'));

        $('#reply').on('autosize:resized', function() {
            console.log('textarea height updated');
            var remainingHeight = leftover - $('.reply-box').height();
            console.log(remainingHeight);
            $('.conversation-box').css('height', remainingHeight.toString() + 'px');
        });
    });

    var socket,
        data;
    $scope.userList = [];
    $scope.loading = false;
    $scope.loginError = false;

    var messagesExample = [
      {
        sender: 'w',
        content: 'yolo <br> sdksmdlaksmdklasmdkasmdlmksadmkamsdlkasmdsam kas sdadka asd a yolo <br> sdksmdlaksmdklasmdkasmdlmksadmkamsdlkasmdsam kas sdadka asd a yolo <br> sdksmdlaksmdklasmdkasmdlmksadmkamsdlkasmdsam kas sdadka asd a'
      },
      {
        sender: 'w',
        content: 'yolo'
      },
      {
        sender: 'u',
        content: 'yolo'
      },
      {
        sender: 'w',
        content: 'yolo'
      },
      {
        sender: 'u',
        content: 'yolo yolo <br> sdksmdlaksmdklasmdkasmdlmksadmkamsdlkasmdsam kas sdadka asd a yolo <br> sdksmdlaksmdklasmdkasmdlmksadmkamsdlkasmdsam kas sdadka asd a'
      }
    ];

    $scope.currConversation = {
      id: 1, //need this to tell what message conversation belongs to when sent
      time: null,
      recipient: 'q',
      latestMessage: null,
      unread: null,
      messages: messagesExample
    }

    $scope.conversationsList = [];

    $scope.$watch(function() {
                    return sockets.checkData();
                  },
                  function() {
                    data = sockets.getData();
                    $scope.onlineList = data.onlineList;
                    if (data.userList && data.onlineList) {
                      console.log('current userList: ' + data.userList);
                      console.log('current onlineList: ' + data.onlineList);
                      var index = data.userList.indexOf($scope.username);
                      if (index > -1) {
                        data.userList.splice(index, 1);
                      }
                      data.userList.sort(sortByOnline);
                      $scope.userList = data.userList;
                    }
                    console.log('saw change in data');
                    console.log(sockets.checkData());
                    console.log('sorted: ' + $scope.userList);
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
            getBasicInfo();
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

    var getBasicInfo = function() {
      $scope.loginMessage = 'Loading Data...';
      sockets.getBasicInfo(socket).then(
        function(data) {
          modals.login.modal('hide');
          $timeout(function() {
                    $scope.loading = false;
                  }, 1000);
          //do something with loaded data
        },
        function() {
          console.log('get basic info failed');
          //show some failure to load info; please refresh page message
        });
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
            // origSender: $scope.username, //verify on server
            origReceiver: $scope.newRecipient,
            message: {
                sender: $scope.username, //verify on server
                content: $scope.newMessage.trim()
              }
          }
          sockets.sendConversation(socket, conversation);
          $scope.currConversation = chats.getConversationInfo(conversation, $scope.username);
          $scope.conversationsList.unshift($scope.currConversation);
          console.log($scope.conversationsList);
          modals.newConversation.modal('hide');
          $timeout(function() {
            $scope.newRecipient = '';
            $scope.newMessage = '';
          }, 1000)
        } else {
          var newRecipient = $scope.newRecipient;
          $scope.newRecipient += ' is not a valid user!';
          showError($('#new-recipient'));
          $timeout(function() {
            $scope.newRecipient = newRecipient;
          }, 1000);
        }
      }
    };

    var showError = function(element) {
      var origColor = element.css('color');
      element.css('color', 'red');
      $timeout(function() {
        element.css('color', origColor);
      }, 1000);
    };

    $scope.sendMessage = function(event) {
      if (!event.shiftKey && event.keyCode == 13 && $scope.replyMessage) {
        event.preventDefault();
        var message = {
          sender: $scope.username,
          content: $scope.replyMessage.trim()
        }
        $scope.replyMessage = '';
        $scope.currConversation.messages.push(message);
        $timeout(function() {
            $('.conversation-box').animate({ scrollTop: $('.conversation-box').prop('scrollHeight') }, 'slow');
            console.log('now running');
            }, 1000);
        sockets.sendMessage(socket, message, $scope.currConversation.id);
      }
    };

    $scope.updateConversation = function(index) {
      $scope.currConversation = $scope.conversationsList[index];
    };

    $scope.logout = function() {
      location.reload(true);
    };

  });
