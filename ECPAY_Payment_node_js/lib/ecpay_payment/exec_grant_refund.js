/**
 * Created by ying.wu on 2017/6/21.
 */
const helper = require('./helper.js');
const verify = require('./verification.js');
const ECpayError = require('./error.js');
const iconv = require('iconv-lite');
const crypto = require('crypto');
const url = require('url');
const querystring = require('querystring');
const http = require('http');
const https = require('https');

class ECpayExecRefundAndGrant{
    constructor(options){
        this.helper = new helper(options);
        // this.verify_act_api = new verify.ActParamVerify();
    }

    credit_do_act(parameters){
        this._act_base_proc(parameters);
        let res = this._act_pos_proc(parameters, 'DoAction');
        return res;
    }
	
	creditcard_period_act(parameters){
        this._act_base_proc(parameters);
        parameters['TimeStamp'] = (parseInt(this._get_curr_unix_time()) + 120).toString();
        let res = this._act_pos_proc(parameters, 'CreditCardPeriodAction');
        return res;
    }

    aio_capture(parameters){
        this._act_base_proc(parameters);
        let res = this._act_pos_proc(parameters , 'Capture');
        return res;
    }

    _act_base_proc(params){
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
	
	 _get_curr_unix_time(){
        return this.helper.get_curr_unixtime();
    }

    _act_pos_proc(params, apiname){
        let verify_act_api = new verify.ActParamVerify(apiname);
        verify_act_api.verify_act_param(params);
        // encode special param

        // Insert chkmacval
        // console.log(params);
        let chkmac = this.helper.gen_chk_mac_value(params);
        params['CheckMacValue'] = chkmac;
        // gen post html
        let api_url = verify_act_api.get_svc_url(apiname, this.helper.get_op_mode());
        //post from server
        let resp = this.helper.http_request('POST', api_url, params);
        // return post response
        return new Promise((resolve, reject) => {
            resp.then(function (result) {
                return resolve(iconv.decode(Buffer.concat(result), 'utf-8'));
            }).catch(function (err) {
                reject(err);
            });
        });
    }
}
module.exports = ECpayExecRefundAndGrant;