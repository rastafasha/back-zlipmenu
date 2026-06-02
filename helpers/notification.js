const handlerResponse = (res, data, code = 200) => {
    res.status(code).send({ data });
};

module.exports = {
    handlerResponse,
};