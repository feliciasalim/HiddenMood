const USER_KEY = 'himo_users';

export function saveUser(user) {
  const users = getUsers();

  const newUser = {
    name: user.name,
    email: user.email,
    password: user.password,
  };

  users.push(newUser);
  localStorage.setItem(USER_KEY, JSON.stringify(users));
}

export function getUsers() {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : [];
}

export function authenticate(email, password) {
  const users = getUsers();
  return users.find(user => user.email === email && user.password === password);
}

export function userExists(email) {
  const users = getUsers();
  return users.some(user => user.email === email);
}
