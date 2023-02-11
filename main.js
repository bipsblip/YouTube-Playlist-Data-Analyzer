const prompt = require('prompt-sync')();
const puppeteer = require('puppeteer');
const pdf = require('pdfkit');
const xlsx = require('xlsx');
const fs = require('fs');

let link = prompt('Enter the YouTube playlist link: ');
let wantpdf = prompt('Do you want a PDF of details of the playlist? (Y/N)? ');
let wantexcel = prompt('Do you want a SpreadSheet of details of the playlist? (Y/N)? ');

let cTab;
task(link);

async function task(the_link_of_the_youtube_playlist) {
    let args = Array.from(arguments);
    try {
        let browserOpen = puppeteer.launch({ //it will return the promise
            // headless: false, 
            // defaultViewport: null, 
            // args: ['--start-maximized'] 
        });

        let browserInstance = await browserOpen; //it will open the new tab
        let allTabsArr = await browserInstance.pages(); //it will return array of all opened tabs

        cTab = allTabsArr[0];
        await cTab.goto(the_link_of_the_youtube_playlist);

        //getting the name pf the playlist
        let name = await cTab.evaluate(function (select) {
            return document.querySelector(select)?.innerText;
        }, '.style-scope.yt-dynamic-sizing-formatted-string.yt-sans-20'); //2nd argument is actually the argument to the function which the first argument

        //getting the stats of the playlist
        let totalVideos = await cTab.evaluate(getTotalVideos, '.byline-item.style-scope.ytd-playlist-byline-renderer > span:first-child');
        //totalVideos = parseInt(totalVideos);
        let totalViews = await cTab.evaluate(getTotalViews, '.metadata-stats.style-scope.ytd-playlist-byline-renderer .byline-item');

        console.log('_______________________________________________________________________');
        console.log(' ');
        console.log("Name of the playlist is: ", name);
        console.log("The playlist contains ", totalVideos, " videos");
        console.log("The playlist has got ", totalViews);
        console.log(' ');


        let currVideosInOneScroll = await getCurrVideosLen();
        while (totalVideos - currVideosInOneScroll >= 1) {
            await scrollToBottom();
            currVideosInOneScroll = await getCurrVideosLen();
        }


        let finalList = await getStats();
        let seconds = calculate(finalList);
        let avgTime = Math.floor(seconds/totalVideos);

        let a = totalLength(avgTime);
        let b = totalLength(seconds);
        let c = playing125(seconds);
        let d = playing150(seconds);
        let e = playing175(seconds);
        let f = playing200(seconds);


        console.log("Average length of video : ", a);
        console.log("Total length of playlist : ", b);
        console.log("Total length of playlist at 1.25x : ", c);
        console.log("Total length of playlist at 1.5x : ", d);
        console.log("Total length of playlist at 1.75x : ", e);
        console.log("Total length of playlist at 2x : ", f);
        console.log('_______________________________________________________________________');
        console.log(' ');



        // PDF creation
        let pdfname = name + ".pdf";
        if(wantpdf == "Y" || wantpdf == "y") {
                let doc = new pdf;
                doc.pipe(fs.createWriteStream(pdfname));
                doc.text(JSON.stringify(finalList));
                doc.end();
        }

        // Spreadsheet creation
        let sheetname = name + ".xlsx";
        if(wantexcel == "Y" || wantexcel == "y") {
                let excel = xlsx.utils.book_new();
                let sheet = xlsx.utils.json_to_sheet(finalList);
                xlsx.utils.book_append_sheet(excel, sheet, "Sheet-1");
                xlsx.writeFile(excel, sheetname);
        }


    } catch (error) {
        console.log(error);
    }
};



function getTotalVideos(selector) {
    return document.querySelector(selector)?.innerText;
}

function getTotalViews(selector) {
    let Views = document.querySelectorAll(selector)[1]?.innerText;
    return Views;
}

async function getCurrVideosLen() {
    let length = await cTab.evaluate(getLength, '#contents ytd-playlist-video-renderer .yt-simple-endpoint.inline-block.style-scope.ytd-thumbnail');
    return length;
}

function getLength(durationSelect) {
    let durationElement = document.querySelectorAll(durationSelect);
    return durationElement.length;
}

async function scrollToBottom() {
    await cTab.evaluate(goToBottom);
    function goToBottom() {
        window.scrollBy(0, window.innerHeight);
    }
}

async function getStats() {
    let list = await cTab.evaluate(getNameAndDuration, 'ytd-playlist-video-renderer #video-title', 
    'ytd-playlist-video-renderer #thumbnail #overlays #text', '#metadata #video-info');
    return list;
}

async function getNameAndDuration(videoSelector, durationSelector, viewsSelector) {
    let videoElement = document.querySelectorAll(videoSelector);
    let durationElement = document.querySelectorAll(durationSelector);
    let viewsElement = document.querySelectorAll(viewsSelector);

    let currentList = [];
    for (let i = 0; i < durationElement.length; ++i) {
        let Serial_No = i + 1;
        let Video_Title = videoElement[i]?.innerText;
        let video_length = durationElement[i]?.innerText;
        let Views = viewsElement[i].querySelectorAll('span')[0]?.innerText;

        video_length = video_length.split(/\r?\n/);
        let Duration;
        if (video_length.length > 1) {
            Duration = video_length[1].trim();
        } else {
            Duration = video_length[0];
        }

        Views = Views.split(' ')[0];

        currentList.push({
            Serial_No,
            Video_Title,
            Duration,
            Views
        })
    }

    return currentList; //array of objects
}

function calculate(list) {
    let timestamp = [];
    for (let i = 0; i < list.length; ++i) {
        let obj = list[i];
        let video_length = obj.Duration;
        timestamp.push(video_length);
    }

    let totalHour = 0;
    let totalMinutes = 0;
    let totalSeconds = 0;
    for (let i = 0; i < timestamp.length; ++i) {
        let time = timestamp[i].split(':');
        if (time.length == 3) {
            totalHour += parseInt(time[0]);
            totalMinutes += parseInt(time[1]);
            totalSeconds += parseInt(time[2]);
        } else if (time.length == 2) {
            totalMinutes += parseInt(time[0]);
            totalSeconds += parseInt(time[1]);
        }
    }
    let seconds = (totalHour*60*60) + (totalMinutes*60) + (totalSeconds);
    return seconds;
}

function totalLength(seconds){
    let secs = seconds % 60;
    let totalMin = Math.floor(seconds/60);
    let min = totalMin % 60;
    let tothrs = Math.floor(totalMin/60);
    let hrs = tothrs%24;
    let days = Math.floor(tothrs/24);
    let print = (days+ " days, " +hrs+ " hours, " +min+ " minutes, " +secs+ " seconds");
    return print;
}

function playing125(seconds){
    let timeIn1_25 = Math.floor(seconds /1.25)
    let print = totalLength(timeIn1_25);
    return print;
}

function playing150(seconds){
    let timeIn1_5 = Math.floor(seconds/1.5); 
    let print = totalLength(timeIn1_5);
    return print;
}

function playing175(seconds){
    let timeIn1_75 = Math.floor(seconds/1.75);    
    let print = totalLength(timeIn1_75);
    return print;
}

function playing200(seconds){
    let timeIn2 = Math.floor(seconds/2); 
    let print = totalLength(timeIn2);
    return print;
}