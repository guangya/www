/**
 * 获取系统环境标识
 * 
 * production 部署环境
 * testing 测试环境
 * development 开发环境
 */
if ( !('env' in window) ) window.env = function () {
    const env = window.localStorage.getItem("environment");
    return env in ["production", "development", "testing"] ? env : "production";
}