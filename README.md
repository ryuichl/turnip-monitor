# turnip-monitor

## 專案內容

為了更方便監控大頭菜價錢
所以建立這個專案
定時監控大頭菜價
當價錢超過指定價格
以 line notify 通知

## 安裝

1. 安裝 nodejs
   https://nodejs.org/en/
   建議裝 LTS 版本
2. 在目標資料夾下開 cmd
3. 下指令 `npm i`

## 使用方式

1. 新增一個.env 檔案
2. 在 .env 輸入 line_notify="你的 token"
3. 下指令 `node turnip-p`

## 支援 heroku 部屬後透過 line 開關追蹤

1. 在 heroku 開啟專案
2. 連接 github 專案
3. 後台 setting -> config vars 填入 line_channelAccessToken, line_channelSecret, line_notify
4. 後台 setting -> BuildPacks 新增 https://github.com/jontewks/puppeteer-heroku-buildpack
5. deploy branch
6. 開始使用 指令包含 help, start, stop
