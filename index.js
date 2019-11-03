const request = require("request-promise")
const fs = require("fs");
const sleep = time => new Promise(resolve => setTimeout(resolve, time));

function file_exist_check(path){
  var exist = false;
  try{
    fs.statSync(path);
    exist = true;
  }catch(err){
    exist = false;
  }

  return exist;
}

function file_load(path){
  var file;
  if(file_exist_check(path)){
    file = fs.readFileSync(path, 'utf8');
  }else{
    console.log("CSV File Not Found.");
    process.exit(1);
  }

  return file;
}

function call_api(host, path, data){
  return new Promise((resolve, reject) => {
      var req = {
        url: "https://" + host + "/api/" + path,
        method: "POST",
        json: data
      }

      request(req).then(async (body) => {
          resolve(body)
      }).catch((err) => {
          reject(err);
      })
  })
}

async function main(){
  var host = process.argv[2];
  var token = process.argv[3];
  var file_path = process.argv[4];

  var lists = file_load(file_path).split("\n");

  console.log(lists);

  var users_list = [];

  for(var i = 0; i < lists.length; i++){
    if(lists[i]){
      var user_split = lists[i].split("@");

      console.log("(" + (i + 1) + "/" + lists.length + ") searching " + lists[i].trim() + "...");
      var data = {
        username: user_split[0].trim(),
        host: user_split[1].trim()
      }

      call_api(host, 'users/show', data).then((value) => {
          users_list.push(value);
      }).catch((err) => {
          console.log(err);
          console.log("users/show error: " + lists[i]);
      });

      await sleep(1500);
    }else{
      console.log("(" + (i + 1) + "/" + lists.length + ") SKIP" + lists[i].trim());
    }
  }

  console.log("Starting follow");
  for(var i = 0; i < users_list.length; i++){
    var data = {
      i: token,
      userId: users_list[i].id
    }

    if(users_list[i].name){
      console.log("(" + (i + 1) + "/" + users_list.length + ") following to " + users_list[i].name + "(@" + users_list[i].username + ")");
    }else{
      console.log("(" + (i + 1) + "/" + users_list.length + ") following to " + users_list[i].username + "(@" + users_list[i].username + ")");
    }

    call_api(host, 'following/create', data).then((value) => {
    }).catch((err) => {
        switch(err.error.error.code){
          case "ALREADY_FOLLOWING":
            console.log("  SKIP(You are already following that user.)")
            break;
          case "FOLLOWEE_IS_YOURSELF":
            console.log("  SKIP(それはあなたです!)")
            break;
          case "BLOCKING":
            console.log("  SKIP(You are blocking that user.)");
            break;
          case "BLOCKED":
            console.log("  SKIP(You are blocked by that user.)");
            break;
          default:
            console.log(err.error.error.code);
            console.log(err.error.error.message);
            console.log("following/create error: " + users_list[i]);
        }

    });
    await sleep(1500);
  }

//  console.log(users_list);
}

main();
