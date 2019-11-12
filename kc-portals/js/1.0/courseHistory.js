;define(['lib/Page'], function(Page){

    function CourseHistory() {

        Page.call(this);

        this.getClassName           = function () {
            return 'CourseHistory';
        };
    }

    CourseHistory.prototype               = Object.create(Page.prototype);
    CourseHistory.prototype.constructor   = CourseHistory;

    return CourseHistory;
});