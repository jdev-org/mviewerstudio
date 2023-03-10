from os import path, mkdir, remove
import logging
import xml.etree.ElementTree as ET
import re
import glob

from ..models.config import ConfigModel
from .login_utils import current_user
from .git_utils import Git_manager

logger = logging.getLogger(__name__)  


'''
This class ease git repo manipulations.
A register from store/register.json is use as global configs metadata store.
DCAT-RDF Metadata are given by front end (see above ConfigModel).
'''
class Config:
    def __init__(self, data = "", app = None, xml = None) -> None:
        '''
        :param data: xml as data from request.data
        :param user: user object from authent infos
        :param app: current app context
        :param xml: xml as string
        '''
        self.uuid = None
        self.full_xml_path = None
        self.app = app
        self.directory = None
        if not xml:
            self.xml = self._read_xml_data(data)
        else:
            self.xml = self._read_xml(xml)
        if self.xml is not None and app.register:
            self.register = app.register

            # target workspace path
            self.workspace = path.join(self.app.config["EXPORT_CONF_FOLDER"], self.uuid)
            # create or update workspace
            self.create_workspace()
            # init or get repo
            self.git = Git_manager(self.workspace)
            self.repo = self.git.repo
            # save xml and git commit
            self.create_or_update_config()
  
    def _read_xml(self, xml):
        '''
        :param xml: str XML config from request
        '''
        xml_parser = ET.fromstring(xml)
        self.meta = self._get_xml_describe(xml_parser)
        if self.meta.find(".//{*}identifier") is not None:
            self.uuid = self.meta.find(".//{*}identifier").text
        return xml_parser

    def _read_xml_data(self, data):
        '''
        Decode request data body to XML.
        Then, will replace user info if exists.
        :param data: string xml from flask request.data
        '''
        # read xml
        self.data = data.decode("utf-8")
        if not data:
            return None

        # keep meta in memory and get UUID app
        return self._read_xml(self.data)

    def create_workspace(self):
        '''
        Init or retrieve workspace
        '''
        if not path.exists(self.workspace):
            # create directory
            mkdir(self.workspace)
            mkdir(path.join(self.workspace, "preview"))
    
    def _get_xml_describe(self, xml):
        '''
        Return metadata from xml DCAT balises
        :param xml: str
        '''
        meta_root = xml.find(".//metadata/{*}RDF/{*}Description")
        # replace anonymous infos by user and org infos
        if current_user and current_user.username:
            self._edit_xml_string(meta_root, "creator", current_user.username)
        if current_user and current_user.organisation:
            self._edit_xml_string(meta_root, "org", current_user.organisation)
        return meta_root
    
    def _edit_xml_string(self, root, attribute, value):
        attr = root.find(".//{*}%s" % attribute)
        attr.text = value
    
    def create_or_update_config(self):
        '''
        Create config workspace and save XML as file.
        Will init git file as version manager.
        '''
        # get meta info from XML
        if self.meta.find(".//{*}identifier"):
            self.uuid = self.meta.find(".//{*}identifier").text
        file_name = self.meta.find("{*}title").text
        # save file
        normalize_file_name = re.sub('[^a-zA-Z0-9  \n\.]', "_", file_name).replace(" ", "_")
        self.full_xml_path = path.join(self.workspace, "%s.xml" % normalize_file_name)
            
        # needed if we change config title to clean others XML
        # if the name is the same, git will just dectect unstaged changes
        self.clean_all_workspace_configs()
        # write file
        xml_to_string = ET.tostring(self.xml).decode("utf-8")
        with open(self.full_xml_path, "w") as file:
            file.write(xml_to_string)
            file.close()
    
    def clean_all_workspace_configs(self):
        '''
        Remove each XML found in app workspace
        '''
        for file in glob.glob("%s/*.xml" % self.workspace):
            remove(file)

    def as_data(self):
        '''
        Index config metadata in register.
        Use to search config by DCAT RDF metadata.
        '''
        subject = self.meta.find("{*}subject").text if self.meta.find("{*}subject") is not None else ""
        url = self.full_xml_path.replace(
            self.app.config["EXPORT_CONF_FOLDER"],
            "",
        )
        return ConfigModel(
            id = self.uuid,
            title = self.meta.find("{*}title").text,
            creator = self.meta.find("{*}creator").text,
            description = self.meta.find("{*}description").text,
            date = self.meta.find("{*}date").text,
            versions = self.git.get_versions(),
            keywords = self.meta.find("{*}keywords").text,
            url = url,
            subject = subject,
        )
    
    def as_dict(self):
        '''
        Get config as dict.
        '''
        return self.as_data().as_dict()