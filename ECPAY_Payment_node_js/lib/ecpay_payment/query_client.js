/**
 * Created by ying.wu on 2017/6/21.
 */
const helper = require('./helper.js');
const verify = require('./verification.js');
const ECpayError = require('./error.js');
const iconv =require('iconv-lite');
const crypto = require('crypto');
const url = require('url');
const querystring = require('querystring');
const http = require('http');
const https = require('https');

class ECpayQueryClient{
    constructor(options){
        this.helper = new helper(options);
        // this.verify_query_api = new verify.QueryParamVerify();
    }

    query_trade_info(parameters){
        this._query_base_proc(parameters);
        parameters['TimeStamp'] = (parseInt(this._get_curr_unix_time()) + 120).toString();
        let res = this._query_pos_proc(parameters, 'QueryTradeInfo');
        return res;
    }

    query_credit_period(parameters){
        this._query_base_proc(parameters);
        parameters['TimeStamp'] = (parseInt(this._get_curr_unix_time()) + 120).toString();
        let res = this._query_pos_proc(parameters, 'QueryCreditCardPeriodInfo');
        return res;
    }

    query_transac_csv(parameters){
        this._query_base_proc(parameters);
        delete parameters['PlatformID'];
        let res = this._query_pos_proc(parameters, 'TradeNoAio', true);
        return res;
    }

    query_credit_single(parameters){
        this._query_base_proc(parameters);
        delete parameters['PlatformID'];
        let res = this._query_pos_proc(parameters, 'QueryTradeV2');
        return res;
    }

    query_credit_csv(parameters){
        this._query_base_proc(parameters);
        delete parameters['PlatformID'];
        let res = this._query_pos_proc(parameters, 'FundingReconDetail', true);
        return res;
    }

    create_server_order(parameters){
        this._query_base_proc(parameters);
        let res = this._query_pos_proc(parameters, 'CreateServerOrder');
        return res;
    }

    _get_curr_unix_time(){
        return this.helper.get_curr_unixtime();
    }

    _query_base_proc(params){
        if (params.constructor === Object){

            // Process PlatformID & MerchantID by contractor setting
            if (this.helper.is_contractor()){
                params['PlatformID'] = this.helper.get_mercid();
                if (params['MerchantID'] === null){
                    throw new Error(`[MerchantID] should be specified when you're contractor-Platform.`);
                }
            } else {
                params['PlatformID'] = '';
                params['MerchantID'] = this.helper.get_mercid();
            }
        } else {
            throw new ECpayError.ECpayInvalidParam(`Received parameter object must be a Object.`);
        }
    }

    _query_pos_proc(params, apiname , big5_trans=false){
        let verify_query_api = new verify.QueryParamVerify(apiname);
        verify_query_api.verify_query_param(params);
        let exclusive_list = [];
        if (apiname === 'CreateServerOrder'){
            exclusive_list = ['PaymentToken'];
        }
        // for PaymentToken
        let exclusive_ele = {};
        exclusive_list.forEach(function (param) {
           exclusive_ele[param] = params[param];
           delete params[param];
        });
        // encode special param
        // Insert chkmacval
        console.log(params);
        let chkmac = this.helper.gen_chk_mac_value(params);
        params['CheckMacValue'] = chkmac;

        let helper = this.helper;
        exclusive_list.forEach(function (param) {
           let paymenttoken = helper.gen_aes_encrypt(exclusive_ele);
           params[param] = paymenttoken;
        });
        console.log(params);

        // gen post html
        let api_url = verify_query_api.get_svc_url(apiname, this.helper.get_op_mode());
        // post from server
        let resp = this.helper.http_request('POST', api_url, params);
        return new Promise((resolve, reject) => {
            resp.then(function (result) {
                    if (big5_trans) {
                        return resolve(iconv.decode(Buffer.concat(result), 'big5'));
                    } else {
                        return resolve(iconv.decode(Buffer.concat(result), 'utf-8'));
                    }

            }).catch(function (err) {
                reject(err);
            });
        });
    }
}
module.exports = ECpayQueryClient;