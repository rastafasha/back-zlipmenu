const getMenuFrontEnd = (role = 'USER') => {

    const menu = [{
            titulo: 'Menu desde sidebarService',
            icono: 'mdi mdi-gauge',
            submenu: [
                // { titulo: 'Main', url: '/' },
                // { titulo: 'progressBar', url: 'progress' },
                // { titulo: 'Donas', url: 'grafica1' },
                // { titulo: 'Promesas', url: 'promesas' },
                // { titulo: 'Rxjs', url: 'rxjs' },
            ]
        },
        {
            titulo: 'Mantenimiento',
            icono: 'mdi mdi-folder-lock-open',
            submenu: [
                // {titulo: 'Usuarios', url:'usuarios'},
                // { titulo: 'Hospitales', url: 'hospitales' },
                // { titulo: 'Medicos', url: 'medicos' },
            ]
        },
    ];

    // const user = [{
    //     first_name: user.first_name,
    //     last_name: user.last_name,
    //     email: user.email,
    //     role: user.role,
    // }];

    if (role === 'ADMIN') {
        menu[1].submenu.unshift({ titulo: 'Usuarios', url: 'dashboard/usuarios' });
    }

    return menu;

};

module.exports = {
    getMenuFrontEnd
};