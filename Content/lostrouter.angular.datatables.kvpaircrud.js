var lookupCrudDir = angular.module('LookupCrudTable', ['resettableForm']);

function LookupCrudTable(http) {
    "use strict";

    function controller(scope, $http, $compile) {
        // configure toastr
        toastr.options = {
            "positionClass": "toast-bottom-full-width",
            "showDuration": "400"
        };

        // data table column definitions
        var columnDefs = [
        { "mData": "Id", "sTitle": "Id", "aTargets": [0], "bVisible": false },
        { "mData": "Name", "sTitle": scope.entityName, "aTargets": [1] },
        { "mDataProp": "Id", "aTargets": [2], "sWidth": "5em", "bSortable": false, "mRender": function (data, type, full) {
            return '<a href="" ng-click="editR(' + data + ')"><img src="Content/file_edit_16x16.png" alt="edit record" title="edit record" /></a>&nbsp;' +
                    '<a href="" ng-click="removeR(' + data + ')"><img src="Content/file_delete_16x16.png" alt="delete record" title="delete record" /></a>';
        }
        }];

        // datatable options
        var options = {
            "bStateSave": true,
            "iCookieDuration": 2419200, /* 1 month */
            "bJQueryUI": false,
            "bPaginate": true,
            "bLengthChange": true,
            "bFilter": true,
            "bSort": true,
            "bInfo": true,
            "bDestroy": true,
            "bProcessing": true,
            "aoColumnDefs": columnDefs,
            // compile each row so that any angular expressions work
            "fnRowCallback": function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                $compile(nRow)(scope);
            }
        };

        // declare the datatable
        scope.dataTable = angular.element('#lookupTable').dataTable(options);

        //        scope.$apply();
    };

    function Link(scope, element, attrs) {

        // watch for any changes to our data, rebuild the DataTable
        scope.$watch(attrs.aaData, function (value) {
            var val = value || null;
            if (val) {
                scope.dataTable.fnClearTable();
                scope.dataTable.fnAddData(scope.aaData);
            }
        }, true);


        function resetForm() {
            scope.errors = '';
            scope.eId = 0;
            scope.eName = '';
            scope.eForm.$setPristine();
        }

        // user has confirmed they want to delete record
        scope.confirmDelete = function () {
            // get antiforgery token
            var token = angular.element('input[name=__RequestVerificationToken]').val();

            // send delete to server
            http({
                url: scope.apiUrl,
                params: { id: scope.toDelete[0].Id },
                method: 'DELETE',
                headers: {
                    "X-XSRF-Token": token,
                    "X-Requested-With": "XMLHttpRequest"
                },
                xsrfCookieName: '__RequestVerificationToken'
            }).success(function (result) {
                // pop toast
                toastr.success(scope.toDelete[0].Name + ' deleted');
                // clear temp holder
                scope.toDelete = {};
                angular.element('#confirmModal').triggerHandler('reveal:close');
            }).error(function (data, status) {
                // pop toast
                toastr.error(scope.toDelete[0].Name + ' could not be deleted. Try again or contact administrator.');
                // clear temp holder
                scope.toDelete = {};
                angular.element('#confirmModal').triggerHandler('reveal:close');
            });
        };

        scope.cancelDelete = function () {
            // put the record back into the array
            scope.aaData.push(scope.toDelete[0]);
            // clear temp holder
            scope.toDelete = {};
            // close dialog
            angular.element('#confirmModal').triggerHandler('reveal:close');
        };

        scope.addR = function () {
            // set title
            scope.modalTitle = addTitle;
            // show dialog
            angular.element('#formModal').reveal({ closeOnBackgroundClick: false });
        };

        scope.editR = function (t) {
            scope.modalTitle = editTitle;
            // find record
            for (var i = 0; i < scope.aaData.length; i++) {
                if (scope.aaData[i].Id === t) {
                    // pop out of array and store in scope variable
                    scope.poppedDept = scope.aaData.splice(i, 1);
                    break;
                }
            }

            // copy onto form
            scope.eId = scope.poppedDept[0].Id;
            scope.eName = scope.poppedDept[0].Name;

            // show form
            angular.element('#formModal').reveal({ closeOnBackgroundClick: false });
        };

        scope.removeR = function (t) {
            // show confirmation modal
            for (var i = 0; i < scope.aaData.length; i++) {
                if (scope.aaData[i].Id === t) {
                    scope.toDelete = scope.aaData.splice(i, 1);
                    break;
                }
            }
            angular.element('#confirmModal').reveal({ closeOnBackgroundClick: false });
        };

        // close modal for add/edit form
        angular.element('#closeModal').on('click', function () {
            // if editing a record, put it back
            if (scope.modalTitle === editTitle) {
                // push original values back onto array
                scope.aaData.push(scope.poppedDept[0]);
            }
            // clear form
            resetForm();
            // close dialog
            angular.element('#formModal').triggerHandler('reveal:close');
        });

        scope.saveChanges = function () {
            scope.errors = '';
            if (scope.eForm.$valid) {

                // map form fields to object
                var data = angular.toJson({
                    Id: scope.eId,
                    Name: scope.eName
                });

                // get antiforgery token
                var token = angular.element('input[name=__RequestVerificationToken]').val();

                // what type of form is this?
                switch (scope.modalTitle) {
                    case addTitle:
                        // post new department to server
                        data.Id = 0;
                        http.post(scope.apiUrl, data,
                            {
                                headers: {
                                    "X-XSRF-Token": token,
                                    "X-Requested-With": "XMLHttpRequest"
                                },
                                xsrfCookieName: '__RequestVerificationToken'
                            }).success(function (result) {
                                if (typeof result.Id !== 'undefined' &&
                                    typeof result.Name !== 'undefined') {

                                    // push new object into data array
                                    scope.aaData.push(result);

                                    // close modal
                                    angular.element('#formModal').triggerHandler('reveal:close');

                                    // pop up toast
                                    toastr.success("Changes Saved!");

                                    // reset form
                                    resetForm();
                                }
                                else {
                                    scope.errors = result;
                                }
                            }).error(function (data, status) {
                                angular.forEach(data, function (v, k) {
                                    scope.errors += v;
                                })
                            });
                        break;
                    case editTitle:
                        // put changes on server
                        http.put(scope.apiUrl, data, {
                            headers: {
                                "X-XSRF-Token": token,
                                "X-Requested-With": "XMLHttpRequest"
                            },
                            xsrfCookieName: '__RequestVerificationToken'
                        }).success(function (result) {
                            if (typeof result.Id !== 'undefined' &&
                                    typeof result.Name !== 'undefined') {

                                // push returned object into data array
                                scope.aaData.push(result);

                                // close modal
                                angular.element('#formModal').triggerHandler('reveal:close');

                                // pop up toast
                                toastr.success("Changes Saved!");

                                // reset form
                                resetForm();
                            }
                            else {
                                scope.errors = result;
                            }
                        }).error(function (data, status) {
                            angular.forEach(data, function (v, k) {
                                scope.errors += v;
                            })
                        });
                        break;
                    default:
                        break;
                };
            }
        };

        var editTitle = 'Edit ' + scope.entityName;
        var addTitle = 'Add ' + scope.entityName;
    };

    // directive definition object
    var ddo = {
        restrict: 'A',
        templateUrl: 'AngularTemplate/LookupCrudTable.html',
        link: Link,
        controller: ['$scope', '$http', '$compile', controller],
        scope: {
            entityName: '=',
            apiUrl: '=',
            aaData: '='
        }
    };

    return ddo;
};

LookupCrudTable.$inject = ['$http'];
lookupCrudDir.directive('LookupCrudTable', LookupCrudTable);