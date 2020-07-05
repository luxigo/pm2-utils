/*
 * pm2-utils.js
 *
 * Copyright (c) 2020 Luc Deschenaux
 *
 * Author(s):
 *
 *      Luc Deschenaux <luc.deschenaux@freesurf.ch>
 * *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
'use strict';

module.exports=function()  {
  var pm2=require('pm2');
  var workerList=[];
  var createPromiseCallback=require('loopback/lib/utils.js').createPromiseCallback;
  var listeners=[];

  function refreshWorkerList(callback){
    callback=callback||createPromiseCallback();
    pm2.list(function (err, data) {
      if (err) {
        console.log(err);
        callback(err);
      } else {
        workerList.splice(0, workerList.lenth, ...data);
        callback(null,workerList);
      }
    });
    return callback.promise;
  }

  function broadcastData(data,options,callback){
    if ('function' == typeof options) {
      callback=options;
      options={}
    }
    var o=options||{};
    if ('string' == typeof o.name) {
      o.name==[o.name];
    }
    callback=callback||createPromiseCallback();
    pm2.connect(function(err){
      if (err) {
        callback(err);
      } else {
        try {
          workerList.forEach(function(worker){
            var pm_id=worker.pm_id;
            if ((o.name ?(o.name.indexOf(worker.name)>=0):(process.env.name==worker.name)) && ((o.includingSelf || pm_id!=Number(process.env.pm_id)))) {
              pm2.sendDataToProcessId(pm_id,data);
              console.log('sendDataToProcessId',pm_id,data);
            }
          });
          pm2.disconnect(callback);
        } catch(e) {
          callback(e);
        }
      }
    });
    return callback.promise;
  }

  function sendDataToProcessId(pm_id,data,callback){
    callback=callback||createPromiseCallback();
    pm2.connect(function(err){
      if (err) {
        callback(err);
      } else {
        try {
          if (process.env.name==worker.name && ((o.includingSelf || pm_id!=process.env.pm_id))) {
            pm2.sendDataToProcessId(pm_id,data);
            console.log('sendDataToProcessId',pm_id,data);
          }
          pm2.disconnect(callback);
        } catch(e) {
          callback(e);
        }
      }
    });
    return callback.promise;
  }

  function init(){
    pm2.connect(function(err){
      if (err) {
        console.log(err);
      } else {
        refreshWorkerList()
          .then(function(workerList){
            if (true) process.nextTick(function(){
              setTimeout(function(){
                broadcastData({
                  topic: "event",
                  data: {
                    type: "hello",
                    pm_id: Number(process.env.pm_id)
                  }
                })
              }, 2000*Number(process.env.pm_id));
            });
          })
          .catch(function(err){
            console.log(err);
          })
          .finally(function(){
            pm2.disconnect(function () {});
          });
      }
    });
  }

  function addEventListener(eventType, handler){
    do {
      var id=process.hrtime().join('');
    } while(listeners.find(function(element){
      return element.id==id
    }));
    var entry={
      id: id,
      type: eventType,
      handler: handler
    };
    listeners.push(entry);
    return function removeListener(){
      var i=listeners.indexOf(entry);
      if (i>=0) array.splice(i,1);
    }
  }

  function initEventHandler(){
    process.on('message', function(data){
      console.log(process.env.name+':'+process.env.pm_id,'message',data);
      if (data.topic=='event') {
        listeners.reduce(function(promise,e){
          return promise.then(function(){
            if (data.data.type==e.type) {
              var callback=createPromiseCallback();
              return e.handler(event,callback);
            } else {
              console.log('miss');
            }
          });
        },Promise.resolve())
          .catch(function(err){
            console.log(err);
          });
      }
    });
  }

  initEventHandler();
  init();

  return {
    pm2: pm2,
    workerList: workerList,
    refreshWorkerList: refreshWorkerList,
    addEventListener: addEventListener,
    sendDataToProcessId: sendDataToProcessId,
    broadcastData: broadcastData
  }

}
