/**
 * Created by ying.wu on 2017/6/12.
 */
const crypto = require('crypto');
const url = require('url');
const querystring = require('querystring');
const http = require('http');
const https = require('https');


class APIHelper {
    constructor(options){
        this.op_mode = options.OperationMode
        this.contractor_stat = options.IsProjectContractor
        if (!options.MercProfile || !options.MercProfile.MerchantID || !options.MercProfile.HashIV || !options.MercProfile.HashKey){
            throw new Error('Please specify the MercProfile')
        }
        this.merc_info = options.MercProfile
        this.ignore_payment = options.IgnorePayment
        this.merc_id = this.merc_info.MerchantID
        this.hkey = this.merc_info.HashKey
        this.hiv = this.merc_info.HashIV
        this.date = new Date();
    }
    get_mercid(){
        return this.merc_id;
    }
    get_op_mode(){
        return this.op_mode;
    }
    get_ignore_pay(){
        return this.ignore_payment;
    }
    get_curr_unixtime(){
        return this.date.getTime().toString().slice(0, 10);
    }
    is_contractor(){
        return this.contractor_stat
    }
    urlencode_dot_net(raw_data, case_tr='DOWN'){
        if (typeof raw_data === 'string') {
            let encode_data = encodeURIComponent(raw_data);
            switch (case_tr) {
                case 'KEEP':
                    // Do nothing
                    break;
                case 'UP':
                    encode_data = encode_data.toUpperCase();
                    break;
                case 'DOWN':
                    encode_data = encode_data.toLowerCase();
                    break;
            }
            encode_data = encode_data.replace(/\'/g,"%27");
            encode_data = encode_data.replace(/\~/g,"%7e");
            encode_data = encode_data.replace(/\%20/g,"+");
            return encode_data
        } else {
            throw new Error("Data received is not a string.");
        }
    }
    encode_special_param(params, target_arr){
        let urlencode_dotnet = this.urlencode_dot_net;
        if (params.constructor === Object) {
            target_arr.forEach(function (n) {
                if (Object.keys(params).includes(n)) {
                    params[n] = urlencode_dotnet(params[n]);
                }
            });
        }
    }
    gen_chk_mac_value(params, mode=1){
       if (params.constructor === Object) {
           // throw exception if param contains CheckMacValue, HashKey, HashIV
           let sec = ['CheckMacValue', 'HashKey', 'HashIV'];
           sec.forEach(function (pa) {
               if (Object.keys(params).includes(pa)) {
                   throw new Error(`Parameters shouldn't contain ${pa}`);
               }
           });

           let od = {};
           let temp_arr = (Object.keys(params).sort(function (a, b) {
               return a.toLowerCase().localeCompare(b.toLowerCase());
           }));
           // console.log(temp_arr);
           let raw = temp_arr.forEach(function (key) {od[key] = params[key];});
           raw = JSON.stringify(od).toLowerCase().replace(/":"/g, '=');
           raw = raw.replace(/","|{"|"}/g, '&');
           raw = this.urlencode_dot_net(`HashKey=${this.hkey}${raw}HashIV=${this.hiv}`);
           console.log(raw);

           let chksum = "";
           switch (mode){
               case 0:
                   chksum = crypto.createHash('md5').update(raw).digest('hex');
                   break;
               case 1:
                   chksum = crypto.createHash('sha256').update(raw).digest('hex');
                   break;
               default:
                   throw new Error("Unexpected hash mode.");
           }

           return chksum.toUpperCase();

       } else {
           throw new Error("Data received is not a Object.");
       }
    }
    gen_aes_encrypt(params){
        if (params.constructor === Object){
            // throw exception if param contains HashKey, HashIV
            let sec = ['HashKey', 'HashIV'];
            sec.forEach(function (pa) {
                if (Object.keys(params).includes(pa)) {
                    throw new Error(`Parameters shouldn't contain ${pa}`);
                }
            });
            let encipher = crypto.createCipheriv('aes-128-cbc', this.hkey, this.hiv);
            let text = params['PaymentToken'];
            let encrypted_base64 = Buffer.concat([encipher.update(text), encipher.final()]).toString('base64');
            return this.urlencode_dot_net(encrypted_base64);
        } else {
            throw new Error(`Data received is not a Object.`);
        }
    }
    http_request(method, api_url, payload){
        if (method !== "GET" && method !== "POST") {
            throw new Error("Only GET & POST method are available.");
        }

        const target_url = url.parse(api_url),
          postData = querystring.stringify(payload)
        let http_op;

        if (target_url.protocol === 'https:'){
            http_op = https;
        } else if (target_url.protocol === 'http:'){
            http_op = http;
        } else {
            throw new Error("Only http & https protocol are available.");
        }

        const options = {
            protocol: target_url['protocol'],
            hostname: target_url['hostname'],
            path: target_url['path'],
            method: method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData),
            }
        }

        return new Promise((resolve, reject) => {

            const req = http_op.request(options, (res) => {
                console.log(`STATUS: ${res.statusCode}`);
                // console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
                // res.setEncoding('utf8');
                const body = [];
                res.on('data', (chunk) => {
                    // console.log(`BODY: ${chunk}`);
                    body.push(chunk);
                });
                res.on('end', () => {
                    // console.log('response data.');
                    // console.log(body);
                    resolve(body);
                });
            });
            req.on('error', (e) => {
                console.error(`problem with request: ${e.message}`);
                reject(e)
            });

            req.write(postData);
            req.end();
        });
    };
    gen_html_post_form(act, id, parameters, input_typ='hidden', submit=true){
        let html = "<form id=\""+ id +"\" action=\""+ act + "\" method=\"post\">";
        Object.keys(parameters).forEach(function (key) {
            html += "<input type=\""+ input_typ +"\" name=\"" + key + "\" id=\"" + key + "\" value=\"" + parameters[key] + "\" />";
        });
        if (submit === true){
            html += `<script type="text/javascript">document.getElementById("${id}").submit();</script>`;
        }
        html += "</form>";
        // console.log(typeof html);
        return html
    }
    valid_chkmc_string(str){
       let rtn_obj = {};
       let rtn_arr = str.split('&');
       rtn_arr.forEach(function (e) {
          let param = e.split('=');
          rtn_obj[param[0]] = param[1];
       });
       let chkmac = rtn_obj['CheckMacValue'];
       delete rtn_obj['CheckMacValue'];
       let val = '';
       if (chkmac.length === 64){
           val = this.gen_chk_mac_value(rtn_obj);
       } else if (chkmac.length === 32) {
           val = this.gen_chk_mac_value(rtn_obj, 0);
       }
       return chkmac === val
    }

}
module.exports = APIHelper;